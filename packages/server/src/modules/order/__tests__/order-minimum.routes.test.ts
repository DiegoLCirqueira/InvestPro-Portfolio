// @investpro/server
// Testes de INTEGRAÇÃO do valor mínimo por ordem (MIN_ORDER_TOTAL = R$ 1,00)
// contra o PostgreSQL real. getQuote é mockado; cada cenário usa um usuário novo.

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { MIN_ORDER_TOTAL_MESSAGE, type Quote } from '@investpro/shared'
import { prisma } from '../../../config/database.js'
import {
  deleteUser,
  fundPortfolio,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
  uniqueIp,
} from '../../../test/integration.helpers.js'

const { getQuoteMock } = vi.hoisted(() => ({ getQuoteMock: vi.fn() }))

vi.mock('../../market/market.service.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../market/market.service.js')>()
  return { ...mod, getQuote: getQuoteMock }
})

let app: FastifyInstance | undefined
const emails: string[] = []

function marketAt(price: number) {
  getQuoteMock.mockImplementation(async (ticker: string): Promise<Quote> => {
    return { ticker, price, change: 0, changePercent: 0 }
  })
}

beforeAll(async () => {
  app = await startApp()
})

beforeEach(() => {
  getQuoteMock.mockReset()
})

afterAll(async () => {
  await stopApp(app)
  await Promise.all(emails.map(deleteUser))
})

async function newUser() {
  const email = uniqueEmail('order-min')
  emails.push(email)
  const reg = await registerTestUser(app!, email)
  const userId = reg.body.user.id as string
  await fundPortfolio(userId, 1000)
  return { userId, token: reg.body.accessToken as string }
}

function order(token: string, payload: Record<string, unknown>) {
  return app!.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    remoteAddress: uniqueIp(),
    payload: { type: 'MARKET', ...payload },
  })
}

async function stateOf(userId: string, ticker: string) {
  const [portfolio, orders] = await Promise.all([
    prisma.portfolio.findUniqueOrThrow({ where: { userId }, include: { positions: true } }),
    prisma.order.count({ where: { userId } }),
  ])
  return {
    balance: portfolio.balance.toNumber(),
    positionQty: portfolio.positions.find((p) => p.ticker === ticker)?.quantity.toNumber() ?? 0,
    orders,
  }
}

function expectTooSmall(res: Awaited<ReturnType<typeof order>>) {
  expect(res.statusCode).toBe(400)
  expect(res.json()).toMatchObject({ error: 'ORDER_TOTAL_TOO_SMALL', message: MIN_ORDER_TOTAL_MESSAGE })
}

describe('POST /api/v1/orders — valor mínimo de R$ 1,00', () => {
  it('R$ 0,99 é recusado sem criar ordem nem mexer no saldo', async () => {
    const { userId, token } = await newUser()
    marketAt(0.99)

    expectTooSmall(await order(token, { ticker: 'VALE3', side: 'BUY', quantity: 1 }))
    expect(await stateOf(userId, 'VALE3')).toEqual({ balance: 1000, positionQty: 0, orders: 0 })
  })

  it('R$ 1,00 é aceito', async () => {
    const { token } = await newUser()
    marketAt(1)

    const res = await order(token, { ticker: 'VALE3', side: 'BUY', quantity: 1 })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'FILLED', fee: 0.01 })
  })

  it('cripto fracionada no limite: 0,00001 BTC a R$ 100.000 (R$ 1,00) passa, 0,0000099 (R$ 0,99) não', async () => {
    const { token } = await newUser()
    marketAt(100_000)

    expectTooSmall(await order(token, { ticker: 'BTC', side: 'BUY', quantity: 0.0000099 }))
    expect((await order(token, { ticker: 'BTC', side: 'BUY', quantity: 0.00001 })).statusCode).toBe(200)
  })

  it('venda da posição inteira de R$ 0,40 é aceita e zera a posição', async () => {
    const { userId, token } = await newUser()
    marketAt(100_000)
    expect((await order(token, { ticker: 'BTC', side: 'BUY', quantity: 0.00001 })).statusCode).toBe(200)
    const before = await stateOf(userId, 'BTC')

    marketAt(40_000) // a posição passa a valer R$ 0,40
    const res = await order(token, { ticker: 'BTC', side: 'SELL', quantity: 0.00001 })

    expect(res.statusCode).toBe(200)
    const after = await stateOf(userId, 'BTC')
    expect(after.positionQty).toBe(0)
    expect(after.balance).toBe(before.balance + 0.4) // 0,40 - 1% = 0,396 -> 0,40
  })

  it('venda parcial abaixo de R$ 1,00 é recusada', async () => {
    const { userId, token } = await newUser()
    marketAt(100_000)
    expect((await order(token, { ticker: 'BTC', side: 'BUY', quantity: 0.00002 })).statusCode).toBe(200)

    marketAt(40_000)
    expectTooSmall(await order(token, { ticker: 'BTC', side: 'SELL', quantity: 0.00001 }))
    expect((await stateOf(userId, 'BTC')).positionQty).toBe(0.00002)
  })

  it('LIMIT/STOP que fica OPEN é avaliada no preço informado', async () => {
    const { userId, token } = await newUser()
    marketAt(20)

    // LIMIT BUY a R$ 0,50 com mercado a R$ 20 não executa: 1 * 0,50 < 1
    expectTooSmall(await order(token, { ticker: 'VALE3', side: 'BUY', type: 'LIMIT', price: 0.5, quantity: 1 }))
    expect((await stateOf(userId, 'VALE3')).orders).toBe(0)
  })

  it('LIMIT que executa na hora também precisa de R$ 1,00 no total de execução', async () => {
    const { userId, token } = await newUser()
    marketAt(50_000)

    // Limite de R$ 200.000 vale R$ 2,00 no preço informado, mas executa a
    // mercado por R$ 0,50: sem essa checagem o arredondamento voltaria a criar dinheiro.
    const res = await order(token, { ticker: 'BTC', side: 'BUY', type: 'LIMIT', price: 200_000, quantity: 0.00001 })

    expectTooSmall(res)
    expect(await stateOf(userId, 'BTC')).toEqual({ balance: 1000, positionQty: 0, orders: 0 })
  })
})
