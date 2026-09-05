// @investpro/server
// Testes de INTEGRAÇÃO das rotas autenticadas de transferências contra o PostgreSQL real.
// transfer.service persiste via prisma.transfer (WI-13); usa usuário de teste novo.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../config/database.js'
import {
  deleteUser,
  fundPortfolio,
  registerTestUser,
  startApp,
  stopApp,
  uniqueCpf,
  uniqueEmail,
  uniqueIp,
} from '../../../test/integration.helpers.js'

let app: FastifyInstance | undefined
let email = ''
let token = ''

interface PortfolioView {
  balance: number
}

async function getPortfolioOf(userToken: string): Promise<PortfolioView> {
  const res = await app!.inject({
    method: 'GET',
    url: '/api/v1/portfolio',
    headers: { authorization: `Bearer ${userToken}` },
    remoteAddress: uniqueIp(),
  })
  expect(res.statusCode).toBe(200)
  return res.json() as PortfolioView
}

async function transfersTotalOf(userToken: string): Promise<number> {
  const res = await app!.inject({
    method: 'GET',
    url: '/api/v1/transfers?page=1&limit=100',
    headers: { authorization: `Bearer ${userToken}` },
  })
  expect(res.statusCode).toBe(200)
  return res.json().total as number
}

beforeAll(async () => {
  app = await startApp()
  email = uniqueEmail('transfer')
  const reg = await registerTestUser(app, email, uniqueCpf())
  token = reg.body.accessToken as string
  await fundPortfolio(reg.body.user.id as string, 100000)
})

afterAll(async () => {
  await stopApp(app)
  await deleteUser(email)
})

describe('POST /api/v1/transfers', () => {
  it('cria transferência PIX e executa (200 COMPLETED)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: {
        type: 'PIX',
        amount: 50.5,
        toAccount: { id: 'acc-1', bank: '001', agency: '0001', account: '12345-6', holderName: 'QA' },
        description: 'Teste PIX',
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.type).toBe('PIX')
    expect(body.amount).toBe(50.5)
    expect(body.status).toBe('COMPLETED')
    expect(body.id).toBeTruthy()
  })

  it('retorna 400 para transferência inválida (amount negativo)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { type: 'PIX', amount: -10 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      remoteAddress: uniqueIp(),
      payload: { type: 'PIX', amount: 10 },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/v1/transfers', () => {
  it('lista as transferências do usuário (200)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/transfers?page=1&limit=10',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.total).toBeGreaterThanOrEqual(1)
  })

  it('retorna 401 com token inválido', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/transfers',
      headers: { authorization: 'Bearer token-invalido' },
    })
    expect(res.statusCode).toBe(401)
  })
})

// WI-13: confirma que a transferência é persistida de fato no Postgres (via
// prisma.transfer), não apenas mantida em memória no processo do servidor.
describe('POST /api/v1/transfers — persistência real no Postgres', () => {
  it('grava a transferência na tabela Transfer (consulta direta via Prisma, fora da rota)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: {
        type: 'TED',
        amount: 321.55,
        toAccount: { id: 'acc-persist-1', bank: '237', agency: '4321', account: '98765-0', holderName: 'Persist QA' },
        description: 'Confirmação de persistência WI-13',
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()

    // Consulta direta ao Postgres via Prisma, sem passar pela rota/serviço:
    // se isso encontrar a linha com os dados certos, a persistência é real.
    const row = await prisma.transfer.findUnique({ where: { id: body.id } })
    expect(row).not.toBeNull()
    expect(row?.type).toBe('TED')
    expect(row?.status).toBe('COMPLETED')
    expect(row?.amount.toNumber()).toBe(321.55)
    expect(row?.description).toBe('Confirmação de persistência WI-13')
    // toAccountId gerado uma única vez na criação (reaproveita o id enviado,
    // já que veio de uma conta existente) — não recalculado a cada leitura.
    expect(row?.toAccountId).toBe('acc-persist-1')
    expect(row?.toAccountBank).toBe('237')
    expect(row?.toAccountAgency).toBe('4321')
    expect(row?.toAccountNumber).toBe('98765-0')
    expect(row?.toAccountHolder).toBe('Persist QA')
  })
})

describe('fluxo completo: criar, listar e paginar (WI-13)', () => {
  let flowEmail = ''
  let flowToken = ''
  const createdIds: string[] = []

  beforeAll(async () => {
    flowEmail = uniqueEmail('transfer-flow')
    const reg = await registerTestUser(app!, flowEmail, uniqueCpf())
    flowToken = reg.body.accessToken as string
    await fundPortfolio(reg.body.user.id as string, 100000)

    for (let i = 0; i < 3; i++) {
      const res = await app!.inject({
        method: 'POST',
        url: '/api/v1/transfers',
        headers: { authorization: `Bearer ${flowToken}`, 'content-type': 'application/json' },
        remoteAddress: uniqueIp(),
        payload: { type: 'PIX', amount: 10 + i, description: `Transferência ${i}` },
      })
      expect(res.statusCode).toBe(200)
      createdIds.push(res.json().id as string)
    }
  })

  afterAll(async () => {
    await deleteUser(flowEmail)
  })

  it('lista todas as transferências criadas (sem paginação)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/transfers?page=1&limit=100',
      headers: { authorization: `Bearer ${flowToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.total).toBe(3)
    expect(body.items).toHaveLength(3)
    expect(body.items.map((t: { id: string }) => t.id).sort()).toEqual([...createdIds].sort())
  })

  it('pagina corretamente: page=1&limit=2 e page=2&limit=2 cobrem os 3 itens sem duplicar', async () => {
    const page1 = await app!.inject({
      method: 'GET',
      url: '/api/v1/transfers?page=1&limit=2',
      headers: { authorization: `Bearer ${flowToken}` },
    })
    expect(page1.statusCode).toBe(200)
    const page1Body = page1.json()
    expect(page1Body.total).toBe(3)
    expect(page1Body.items).toHaveLength(2)

    const page2 = await app!.inject({
      method: 'GET',
      url: '/api/v1/transfers?page=2&limit=2',
      headers: { authorization: `Bearer ${flowToken}` },
    })
    expect(page2.statusCode).toBe(200)
    const page2Body = page2.json()
    expect(page2Body.total).toBe(3)
    expect(page2Body.items).toHaveLength(1)

    const allIds = [...page1Body.items, ...page2Body.items].map((t: { id: string }) => t.id)
    expect(new Set(allIds).size).toBe(3)
    expect(allIds.sort()).toEqual([...createdIds].sort())
  })
})

// WI-13: a persistência precisa sobreviver a um restart real do servidor
// (novo processo/instância Fastify), não só a chamadas sucessivas na mesma
// instância em memória.
describe('transferência sobrevive a um restart do servidor', () => {
  it('criada antes do restart, ainda aparece na listagem depois de fechar e recriar a instância Fastify', async () => {
    const restartEmail = uniqueEmail('transfer-restart')

    let appBeforeRestart: FastifyInstance | undefined = await startApp()
    const reg = await registerTestUser(appBeforeRestart, restartEmail, uniqueCpf())
    const restartToken = reg.body.accessToken as string
    await fundPortfolio(reg.body.user.id as string, 100000)

    const created = await appBeforeRestart.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: { authorization: `Bearer ${restartToken}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { type: 'DOC', amount: 77.7, description: 'Antes do restart' },
    })
    expect(created.statusCode).toBe(200)
    const transferId = created.json().id as string

    // Simula o restart: fecha essa instância do Fastify e sobe uma nova —
    // se a transferência sobreviver, não estava só em memória de processo.
    await stopApp(appBeforeRestart)
    appBeforeRestart = undefined

    const appAfterRestart = await startApp()
    try {
      const res = await appAfterRestart.inject({
        method: 'GET',
        url: '/api/v1/transfers?page=1&limit=10',
        headers: { authorization: `Bearer ${restartToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.items.map((t: { id: string }) => t.id)).toContain(transferId)
    } finally {
      await stopApp(appAfterRestart)
      await deleteUser(restartEmail)
    }
  })
})

// Bugfix (produção): createTransfer não debitava Portfolio.balance nem validava
// saldo suficiente antes de completar a transferência — toda transferência era
// aceita e concluída independente do saldo. Estes testes cobrem os dois casos
// do critério de aceitação: rejeição por saldo insuficiente (sem persistir
// nada e sem alterar o saldo) e débito exato (amount + tarifa) quando há saldo.
describe('regra de saldo: valida saldo suficiente e debita Portfolio.balance (bugfix)', () => {
  let balanceEmail = ''
  let balanceToken = ''
  let balanceUserId = ''

  beforeAll(async () => {
    balanceEmail = uniqueEmail('transfer-balance')
    const reg = await registerTestUser(app!, balanceEmail, uniqueCpf())
    balanceToken = reg.body.accessToken as string
    balanceUserId = reg.body.user.id as string
  })

  afterAll(async () => {
    await deleteUser(balanceEmail)
  })

  it('TED com valor + tarifa maior que o saldo é rejeitada (400) e não persiste nem altera o saldo', async () => {
    await fundPortfolio(balanceUserId, 100)
    const totalBefore = await transfersTotalOf(balanceToken)

    // amount 95 + tarifa TED (10) = 105 > saldo de 100
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: { authorization: `Bearer ${balanceToken}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { type: 'TED', amount: 95, description: 'Deve ser rejeitada por saldo' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('TRANSFER_INSUFFICIENT_BALANCE')

    const after = await getPortfolioOf(balanceToken)
    expect(after.balance).toBe(100)
    expect(await transfersTotalOf(balanceToken)).toBe(totalBefore)
  })

  it('PIX dentro do saldo (sem tarifa) decrementa o valor exato e conclui (200 COMPLETED)', async () => {
    await fundPortfolio(balanceUserId, 300)

    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: { authorization: `Bearer ${balanceToken}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { type: 'PIX', amount: 300, description: 'PIX no limite exato do saldo' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('COMPLETED')

    const after = await getPortfolioOf(balanceToken)
    expect(after.balance).toBe(0)
  })

  it('TED dentro do saldo debita amount + tarifa (não só o amount)', async () => {
    await fundPortfolio(balanceUserId, 1000)

    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: { authorization: `Bearer ${balanceToken}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { type: 'TED', amount: 500, description: 'TED com tarifa' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('COMPLETED')

    // 1000 - (500 + tarifa TED de 10) = 490
    const after = await getPortfolioOf(balanceToken)
    expect(after.balance).toBe(490)
  })
})

// WI-26: decisão arquitetural R5 (BACEN) exige CPF preenchido pra criar
// Transfer. A checagem roda ANTES de tocar em saldo/DB, então mesmo com saldo
// de sobra a transferência é rejeitada sem CPF.
describe('CPF obrigatório para criar Transfer (WI-26)', () => {
  let noCpfEmail = ''
  let noCpfToken = ''
  let withCpfEmail = ''
  let withCpfToken = ''

  beforeAll(async () => {
    noCpfEmail = uniqueEmail('transfer-no-cpf')
    const regNoCpf = await registerTestUser(app!, noCpfEmail) // sem cpf (default do helper)
    noCpfToken = regNoCpf.body.accessToken as string
    await fundPortfolio(regNoCpf.body.user.id as string, 100000)

    withCpfEmail = uniqueEmail('transfer-with-cpf')
    const regWithCpf = await registerTestUser(app!, withCpfEmail, uniqueCpf())
    withCpfToken = regWithCpf.body.accessToken as string
    await fundPortfolio(regWithCpf.body.user.id as string, 100000)
  })

  afterAll(async () => {
    await deleteUser(noCpfEmail)
    await deleteUser(withCpfEmail)
  })

  it('usuário sem CPF: 400 CPF_REQUIRED mesmo com saldo de sobra, saldo intacto e nada persistido', async () => {
    const totalBefore = await transfersTotalOf(noCpfToken)

    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: { authorization: `Bearer ${noCpfToken}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { type: 'PIX', amount: 50, description: 'Deve ser rejeitada por falta de CPF' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('CPF_REQUIRED')

    const after = await getPortfolioOf(noCpfToken)
    expect(after.balance).toBe(100000)
    expect(await transfersTotalOf(noCpfToken)).toBe(totalBefore)
  })

  it('usuário com CPF: transferência continua funcionando normalmente (regressão)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: { authorization: `Bearer ${withCpfToken}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { type: 'PIX', amount: 50, description: 'CPF preenchido' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('COMPLETED')

    const after = await getPortfolioOf(withCpfToken)
    expect(after.balance).toBe(99950)
  })
})
