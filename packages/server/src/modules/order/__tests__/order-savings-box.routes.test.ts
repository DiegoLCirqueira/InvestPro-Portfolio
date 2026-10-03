// @investpro/server
// Testes de INTEGRAÇÃO da compra com a Caixinha (useSavingsBox) contra o
// PostgreSQL real. getQuote é mockado (R$ 20 por padrão) pra não ir à rede.
// Cada cenário usa um usuário novo, com saldo e Caixinha gravados direto no DB.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { Quote } from '@investpro/shared'
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

beforeAll(async () => {
  app = await startApp()
  getQuoteMock.mockReset()
  getQuoteMock.mockImplementation(async (ticker: string): Promise<Quote> => {
    return { ticker, price: 20, change: 0, changePercent: 0 }
  })
})

afterAll(async () => {
  await stopApp(app)
  await Promise.all(emails.map(deleteUser))
})

async function userWith(balance: number, savingsBox: number) {
  const email = uniqueEmail('order-savings')
  emails.push(email)
  const reg = await registerTestUser(app!, email)
  const userId = reg.body.user.id as string
  await fundPortfolio(userId, balance)
  await prisma.savingsBox.create({ data: { userId, balance: savingsBox } })
  return { userId, token: reg.body.accessToken as string }
}

function buy(token: string, payload: Record<string, unknown>) {
  return app!.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    remoteAddress: uniqueIp(),
    payload: { ticker: 'VALE3', side: 'BUY', type: 'MARKET', ...payload },
  })
}

async function stateOf(userId: string) {
  const [portfolio, box, orders, savingsSnapshots] = await Promise.all([
    prisma.portfolio.findUniqueOrThrow({ where: { userId }, include: { positions: true } }),
    prisma.savingsBox.findUniqueOrThrow({ where: { userId } }),
    prisma.order.count({ where: { userId } }),
    prisma.portfolioSnapshot.count({ where: { userId, reason: 'SAVINGS' } }),
  ])
  return {
    balance: portfolio.balance.toNumber(),
    savingsBox: box.balance.toNumber(),
    positionQty: portfolio.positions.find((p) => p.ticker === 'VALE3')?.quantity.toNumber() ?? 0,
    orders,
    savingsSnapshots,
  }
}

describe('POST /api/v1/orders com useSavingsBox', () => {
  it('saldo em conta basta: não toca a Caixinha e devolve savingsBoxUsed 0', async () => {
    const { userId, token } = await userWith(1000, 500)

    const res = await buy(token, { quantity: 10, useSavingsBox: true })

    expect(res.statusCode).toBe(200)
    expect(res.json().savingsBoxUsed).toBe(0)
    expect(await stateOf(userId)).toEqual({
      balance: 798, // 1000 - (10 * 20 + 1%)
      savingsBox: 500,
      positionQty: 10,
      orders: 1,
      savingsSnapshots: 0,
    })
  })

  it('falta saldo e a Caixinha cobre: resgata só a diferença e deixa o rastro do resgate', async () => {
    const { userId, token } = await userWith(100, 500)

    const res = await buy(token, { quantity: 10, useSavingsBox: true })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'FILLED', fee: 2, savingsBoxUsed: 102 })
    expect(await stateOf(userId)).toEqual({
      balance: 0, // 100 + 102 resgatados - 202 de custo
      savingsBox: 398,
      positionQty: 10,
      orders: 1,
      savingsSnapshots: 1, // mesma fotografia que um resgate normal grava
    })
  })

  it('saldo + Caixinha não bastam: 400 ORDER_INSUFFICIENT_BALANCE e nada muda', async () => {
    const { userId, token } = await userWith(100, 50)

    const res = await buy(token, { quantity: 10, useSavingsBox: true })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('ORDER_INSUFFICIENT_BALANCE')
    expect(await stateOf(userId)).toEqual({
      balance: 100,
      savingsBox: 50,
      positionQty: 0,
      orders: 0,
      savingsSnapshots: 0,
    })
  })

  it('sem useSavingsBox o comportamento é o de antes: 400 mesmo com Caixinha e sem savingsBoxUsed', async () => {
    const { userId, token } = await userWith(100, 500)

    const insufficient = await buy(token, { quantity: 10 })
    expect(insufficient.statusCode).toBe(400)
    expect(insufficient.json().error).toBe('ORDER_INSUFFICIENT_BALANCE')

    const ok = await buy(token, { quantity: 1, useSavingsBox: false })
    expect(ok.statusCode).toBe(200)
    expect(ok.json()).not.toHaveProperty('savingsBoxUsed')
    expect((await stateOf(userId)).savingsBox).toBe(500)
  })

  it('useSavingsBox em venda: 400 VALIDATION_ERROR sem criar ordem', async () => {
    const { userId, token } = await userWith(1000, 500)

    const res = await buy(token, { side: 'SELL', quantity: 1, useSavingsBox: true })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('VALIDATION_ERROR')
    expect((await stateOf(userId)).orders).toBe(0)
  })

  it('centavos: resgata a diferença exata do custo arredondado', async () => {
    const { userId, token } = await userWith(0.07, 20)
    getQuoteMock.mockImplementationOnce(async (ticker: string): Promise<Quote> => {
      return { ticker, price: 1.43, change: 0, changePercent: 0 }
    })

    // 7 * 1,43 = 10,01 (em float 10,009999...) + 1% = 10,1101 -> custo 10,11
    const res = await buy(token, { quantity: 7, useSavingsBox: true })

    expect(res.statusCode).toBe(200)
    expect(res.json().savingsBoxUsed).toBe(10.04)
    const state = await stateOf(userId)
    expect(state.balance).toBe(0)
    expect(state.savingsBox).toBe(9.96)
  })

  it('duas compras simultâneas não gastam o mesmo dinheiro da Caixinha', async () => {
    // Caixinha cobre uma compra de 202, não duas.
    const { userId, token } = await userWith(0, 300)

    const results = await Promise.all([
      buy(token, { quantity: 10, useSavingsBox: true }),
      buy(token, { quantity: 10, useSavingsBox: true }),
    ])

    const statuses = results.map((r) => r.statusCode).sort()
    expect(statuses).toEqual([200, 400])
    const rejected = results.find((r) => r.statusCode === 400)!
    expect(rejected.json().error).toBe('ORDER_INSUFFICIENT_BALANCE')
    expect(await stateOf(userId)).toEqual({
      balance: 0,
      savingsBox: 98,
      positionQty: 10,
      orders: 1,
      savingsSnapshots: 1,
    })
  })
})
