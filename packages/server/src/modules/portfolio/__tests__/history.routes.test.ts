// @investpro/server
// Testes de INTEGRAÇÃO do histórico real do patrimônio (PortfolioSnapshot)
// contra o PostgreSQL real, sempre com contas descartáveis.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../config/database.js'
import {
  deleteUser,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
  uniqueIp,
  uniqueValidCpf,
} from '../../../test/integration.helpers.js'
import { dayKey } from '../history.domain.js'

const DAY_MS = 24 * 60 * 60 * 1000

interface HistoryBody {
  history: Array<{ date: string; balance: number; netFlow: number }>
  returnPct: number | null
}

let app: FastifyInstance | undefined
const emails: string[] = []

beforeAll(async () => {
  app = await startApp()
})

afterAll(async () => {
  for (const email of emails) await deleteUser(email)
  await stopApp(app)
})

async function newUser() {
  const email = uniqueEmail('history')
  emails.push(email)
  const reg = await registerTestUser(app!, email, uniqueValidCpf())
  return { id: reg.body.user.id as string, token: reg.body.accessToken as string }
}

function call(token: string, method: 'GET' | 'POST', url: string, payload?: object) {
  return app!.inject({
    method,
    url,
    headers: { authorization: `Bearer ${token}` },
    remoteAddress: uniqueIp(),
    ...(payload ? { payload } : {}),
  })
}

async function history(token: string, period = '7d'): Promise<HistoryBody> {
  const res = await call(token, 'GET', `/api/v1/portfolio/history?period=${period}`)
  expect(res.statusCode).toBe(200)
  return res.json() as HistoryBody
}

// Joga as fotografias do usuário para `days` dias atrás (simula passado).
async function shiftSnapshots(userId: string, days: number) {
  const snapshots = await prisma.portfolioSnapshot.findMany({ where: { userId } })
  for (const snapshot of snapshots) {
    await prisma.portfolioSnapshot.update({
      where: { id: snapshot.id },
      data: { createdAt: new Date(snapshot.createdAt.getTime() - days * DAY_MS) },
    })
  }
}

describe('GET /api/v1/portfolio/history (histórico real)', () => {
  it('conta nova começa hoje, sem curva inventada', async () => {
    const user = await newUser()
    const body = await history(user.token)

    expect(body.history).toEqual([{ date: dayKey(new Date()), balance: 0, netFlow: 0 }])
    expect(body.returnPct).toBeNull()
  })

  it('o passado não muda quando o saldo muda; aporte e PIX aparecem como fluxo, não rendimento', async () => {
    const user = await newUser()
    expect((await call(user.token, 'POST', '/api/v1/portfolio/topup', { amount: 1000 })).statusCode).toBe(200)
    await history(user.token)

    // Aporte de 1000 "há 3 dias" e valorização para 1100 "há 2 dias".
    await shiftSnapshots(user.id, 3)
    await prisma.portfolioSnapshot.create({
      data: { userId: user.id, equity: 1100, reason: 'DAILY', createdAt: new Date(Date.now() - 2 * DAY_MS) },
    })
    const before = await history(user.token)
    const past = before.history.slice(0, -1)

    // Hoje: novo aporte de 500 e PIX de 200.
    expect((await call(user.token, 'POST', '/api/v1/portfolio/topup', { amount: 500 })).statusCode).toBe(200)
    const pix = await call(user.token, 'POST', '/api/v1/transfers', {
      type: 'PIX',
      amount: 200,
      pixKey: 'destino@investpro.dev.br',
    })
    expect(pix.statusCode).toBe(200)

    const after = await history(user.token)
    expect(after.history.slice(0, past.length)).toEqual(past)
    expect(past[0]).toMatchObject({ balance: 1000, netFlow: 1000 })
    expect(past[1]).toMatchObject({ balance: 1100, netFlow: 0 })
    expect(after.history.at(-1)).toMatchObject({ date: dayKey(new Date()), balance: 1300, netFlow: 300 })
  })

  it('métricas de risco avisam histórico insuficiente em vez de dar nota falsa', async () => {
    const user = await newUser()
    await call(user.token, 'POST', '/api/v1/portfolio/topup', { amount: 1000 })

    const res = await call(user.token, 'GET', '/api/v1/risk/report')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ insufficientHistory: true })
    expect(res.json().score).toBeUndefined()
  })

  it('conta anterior ao histórico: reconstrói aportes/transferências já registrados, uma única vez', async () => {
    const user = await newUser()
    const portfolio = await prisma.portfolio.findUniqueOrThrow({ where: { userId: user.id } })
    await prisma.portfolio.update({ where: { id: portfolio.id }, data: { balance: 700 } })
    await prisma.balanceTopUp.create({
      data: {
        userId: user.id,
        actorUserId: user.id,
        amount: 1000,
        balanceAfter: 1000,
        createdAt: new Date(Date.now() - 5 * DAY_MS),
      },
    })
    await prisma.transfer.create({
      data: {
        userId: user.id,
        type: 'PIX',
        status: 'COMPLETED',
        amount: 300,
        pixKey: 'destino@investpro.dev.br',
        createdAt: new Date(Date.now() - 2 * DAY_MS),
      },
    })

    const body = await history(user.token)
    expect(body.history[0]).toMatchObject({ balance: 1000, netFlow: 1000 })
    expect(body.history.find((p) => p.netFlow === -300)).toMatchObject({ balance: 700 })
    expect(body.history.at(-1)).toMatchObject({ balance: 700 })

    const count = await prisma.portfolioSnapshot.count({ where: { userId: user.id } })
    await history(user.token)
    expect(await prisma.portfolioSnapshot.count({ where: { userId: user.id } })).toBe(count)
  })
})
