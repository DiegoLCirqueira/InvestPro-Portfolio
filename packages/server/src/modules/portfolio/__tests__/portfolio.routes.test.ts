// @investpro/server
// Testes de INTEGRAÇÃO das rotas autenticadas de portfólio contra o PostgreSQL real.
// O token é gerado com o mesmo JWT_SECRET (autenticate valida user no DB real),
// evitando estourar o rate-limit de /auth/login. Lê os dados do seed (5 posições).

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../config/database.js'
import {
  startApp,
  stopApp,
  signAccessTokenFor,
  registerTestUser,
  deleteUser,
  uniqueEmail,
  uniqueIp,
} from '../../../test/integration.helpers.js'
import { INITIAL_ACCOUNT_BALANCE, MAX_TOTAL_TOP_UP } from '@investpro/shared'

let app: FastifyInstance | undefined
let token = ''
let userId = ''

beforeAll(async () => {
  app = await startApp()
  const user = await prisma.user.findUnique({
    where: { email: 'diego@investpro.com' },
    select: { id: true },
  })
  userId = user!.id
  token = signAccessTokenFor(userId)
})

afterAll(async () => {
  await stopApp(app)
})

describe('GET /api/v1/portfolio', () => {
  it('retorna o portfólio do seed com saldo e 5 posições (200)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.balance).toBe(175450.32)
    expect(body.positions).toHaveLength(5)
    const tickers = body.positions.map((p: { ticker: string }) => p.ticker)
    expect(tickers).toContain('BTC')
    expect(tickers).toContain('VALE3')
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/portfolio' })
    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('UNAUTHORIZED')
  })

  it('retorna 401 com token inválido', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio',
      headers: { authorization: 'Bearer token-invalido' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('UNAUTHORIZED')
  })
})

// O comportamento da série (fotografias reais) é coberto em history.routes.test.ts
// com contas descartáveis: o histórico grava dados e não deve tocar a conta seed.
describe('GET /api/v1/portfolio/history', () => {
  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/portfolio/history?period=7d' })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/v1/portfolio/diversification', () => {
  it('retorna composição por tipo de ativo com percentuais (200)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio/diversification',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    // Patrimônio total (caixa + posições), não só o caixa: WI-14.
    expect(body.totalBalance).toBe(175450.32)
    expect(body.breakdown.length).toBeGreaterThanOrEqual(3)
    const types = body.breakdown.map((b: { type: string }) => b.type)
    expect(types).toContain('STOCK')
    expect(types).toContain('CRYPTO')
    expect(types).toContain('FIXED_INCOME')
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/portfolio/diversification' })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /api/v1/portfolio/topup', () => {
  // Usuário descartável próprio (não o seed diego): top-up muda o saldo de
  // verdade no DB real, e os testes de GET acima dependem do saldo fixo do
  // seed (175450.32).
  const topupEmail = uniqueEmail('topup')
  let topupToken = ''
  let topupUserId = ''

  beforeAll(async () => {
    const { body } = await registerTestUser(app!, topupEmail)
    topupToken = body.accessToken
    topupUserId = body.user.id
  })

  afterAll(async () => {
    await deleteUser(topupEmail)
  })

  it('incrementa o saldo do portfólio autenticado (200)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/portfolio/topup',
      headers: { authorization: `Bearer ${topupToken}` },
      payload: { amount: 500 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().balance).toBe(INITIAL_ACCOUNT_BALANCE + 500)

    const again = await app!.inject({
      method: 'POST',
      url: '/api/v1/portfolio/topup',
      headers: { authorization: `Bearer ${topupToken}` },
      payload: { amount: 250.5 },
    })
    expect(again.statusCode).toBe(200)
    expect(again.json().balance).toBe(INITIAL_ACCOUNT_BALANCE + 750.5)
  })

  it('grava um BalanceTopUp por chamada, com userId/actorUserId e balanceAfter corretos', async () => {
    // Continua o mesmo usuário do teste anterior (saldo inicial + 750.5 nesse ponto).
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/portfolio/topup',
      headers: { authorization: `Bearer ${topupToken}` },
      payload: { amount: 100 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().balance).toBe(INITIAL_ACCOUNT_BALANCE + 850.5)

    const rows = await prisma.balanceTopUp.findMany({
      where: { userId: topupUserId },
      orderBy: { createdAt: 'asc' },
    })
    // As 3 chamadas deste describe (500, 250.5, 100) geraram 3 registros.
    expect(rows).toHaveLength(3)

    const last = rows[rows.length - 1]
    expect(last.userId).toBe(topupUserId)
    // Hoje o top-up só credita a própria conta: actor === userId, mas vindo
    // do token (não copiado de userId) — ver comentário em portfolio.routes.ts.
    expect(last.actorUserId).toBe(topupUserId)
    expect(last.amount.toNumber()).toBe(100)
    expect(last.balanceAfter.toNumber()).toBe(INITIAL_ACCOUNT_BALANCE + 850.5)
  })

  it('retorna 400 para amount não positivo', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/portfolio/topup',
      headers: { authorization: `Bearer ${topupToken}` },
      payload: { amount: 0 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/portfolio/topup',
      payload: { amount: 100 },
    })
    expect(res.statusCode).toBe(401)
  })
})

// IP próprio por requisição: o rate-limit de escrita é por IP e este arquivo
// já faz várias chamadas.
describe('limite do total adicionado (POST /topup e GET /topup-limit)', () => {
  const email = uniqueEmail('topup-limit')
  let token = ''

  beforeAll(async () => {
    const { body } = await registerTestUser(app!, email)
    token = body.accessToken
  })

  afterAll(async () => {
    await deleteUser(email)
  })

  const topUp = (amount: number) =>
    app!.inject({
      method: 'POST',
      url: '/api/v1/portfolio/topup',
      headers: { authorization: `Bearer ${token}` },
      remoteAddress: uniqueIp(),
      payload: { amount },
    })

  const limit = async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio/topup-limit',
      headers: { authorization: `Bearer ${token}` },
      remoteAddress: uniqueIp(),
    })
    expect(res.statusCode).toBe(200)
    return res.json()
  }

  it('conta nova tem o limite inteiro: o saldo inicial não conta como top-up', async () => {
    expect(await limit()).toEqual({ limit: MAX_TOTAL_TOP_UP, used: 0, remaining: MAX_TOTAL_TOP_UP })
  })

  it('recusa (422) o que passa do restante e aceita exatamente o restante', async () => {
    expect((await topUp(MAX_TOTAL_TOP_UP - 100)).statusCode).toBe(200)
    expect(await limit()).toMatchObject({ used: MAX_TOTAL_TOP_UP - 100, remaining: 100 })

    const over = await topUp(100.01)
    expect(over.statusCode).toBe(422)
    expect(over.json()).toMatchObject({ error: 'TOPUP_LIMIT_EXCEEDED' })
    expect(over.json().message).toContain('R$ 100,00')

    expect((await topUp(100)).statusCode).toBe(200)
    expect(await limit()).toMatchObject({ used: MAX_TOTAL_TOP_UP, remaining: 0 })
  })

  it('com o limite esgotado, qualquer top-up é recusado sem mudar o saldo', async () => {
    const res = await topUp(0.01)
    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ error: 'TOPUP_LIMIT_EXCEEDED' })

    const portfolio = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio',
      headers: { authorization: `Bearer ${token}` },
      remoteAddress: uniqueIp(),
    })
    expect(portfolio.json().balance).toBe(INITIAL_ACCOUNT_BALANCE + MAX_TOTAL_TOP_UP)
  })

  it('top-ups simultâneos não furam o teto', async () => {
    const otherEmail = uniqueEmail('topup-race')
    const { body } = await registerTestUser(app!, otherEmail)
    try {
      const results = await Promise.all(
        [0, 1, 2].map(() =>
          app!.inject({
            method: 'POST',
            url: '/api/v1/portfolio/topup',
            headers: { authorization: `Bearer ${body.accessToken}` },
            remoteAddress: uniqueIp(),
            payload: { amount: MAX_TOTAL_TOP_UP / 2 },
          })
        )
      )
      expect(results.filter((res) => res.statusCode === 200)).toHaveLength(2)
      expect(results.filter((res) => res.statusCode === 422)).toHaveLength(1)
    } finally {
      await deleteUser(otherEmail)
    }
  })

  it('GET /topup-limit exige autenticação (401)', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/portfolio/topup-limit' })
    expect(res.statusCode).toBe(401)
  })
})
