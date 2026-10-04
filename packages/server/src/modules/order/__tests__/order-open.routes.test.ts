// @investpro/server
// Testes de INTEGRAÇÃO da criação de LIMIT/STOP que ficam OPEN contra o
// PostgreSQL real: saldo/posição precisam cobrir a ordem mais as outras OPEN.
// getQuote é mockado (R$ 20) pra não ir à rede; cada cenário usa um usuário novo.

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

async function userWith(balance: number) {
  const email = uniqueEmail('order-open')
  emails.push(email)
  const reg = await registerTestUser(app!, email)
  const userId = reg.body.user.id as string
  await fundPortfolio(userId, balance)
  return { userId, token: reg.body.accessToken as string }
}

function order(token: string, payload: Record<string, unknown>) {
  return app!.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    remoteAddress: uniqueIp(),
    payload: { ticker: 'VALE3', ...payload },
  })
}

// Mercado a R$ 20: LIMIT BUY a R$ 10 e LIMIT SELL a R$ 30 nunca executam na hora.
const openBuy = (quantity: number) => ({ side: 'BUY', type: 'LIMIT', price: 10, quantity })
const openSell = (quantity: number) => ({ side: 'SELL', type: 'LIMIT', price: 30, quantity })

async function stateOf(userId: string) {
  const [portfolio, orders] = await Promise.all([
    prisma.portfolio.findUniqueOrThrow({ where: { userId }, include: { positions: true } }),
    prisma.order.findMany({ where: { userId }, select: { status: true } }),
  ])
  return {
    balance: portfolio.balance.toNumber(),
    positionQty: portfolio.positions.find((p) => p.ticker === 'VALE3')?.quantity.toNumber() ?? 0,
    openOrders: orders.filter((o) => o.status === 'OPEN').length,
  }
}

describe('POST /api/v1/orders — LIMIT/STOP que ficam OPEN', () => {
  describe('compra', () => {
    it('acima do saldo em conta: 400 ORDER_INSUFFICIENT_BALANCE e nada criado', async () => {
      const { userId, token } = await userWith(100)

      // 10 * 10 + 1% = 101 > 100
      const res = await order(token, openBuy(10))

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('ORDER_INSUFFICIENT_BALANCE')
      expect(await stateOf(userId)).toEqual({ balance: 100, positionQty: 0, openOrders: 0 })
    })

    it('custo exato do saldo é aceito e não debita nada', async () => {
      const { userId, token } = await userWith(101)

      const res = await order(token, openBuy(10))

      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('OPEN')
      expect(await stateOf(userId)).toEqual({ balance: 101, positionQty: 0, openOrders: 1 })
    })

    it('duas que juntas passam do saldo: a 2ª é recusada', async () => {
      const { userId, token } = await userWith(150)

      expect((await order(token, openBuy(10))).statusCode).toBe(200) // reserva 101
      const second = await order(token, openBuy(5)) // 50,50: 151,50 > 150

      expect(second.statusCode).toBe(400)
      expect(second.json().error).toBe('ORDER_INSUFFICIENT_BALANCE')
      expect(await stateOf(userId)).toEqual({ balance: 150, positionQty: 0, openOrders: 1 })
    })

    it('STOP também reserva pelo preço informado', async () => {
      const { token } = await userWith(100)

      // STOP BUY a R$ 30 com mercado a R$ 20 fica OPEN: 10 * 30 + 1% = 303 > 100
      const res = await order(token, { side: 'BUY', type: 'STOP', price: 30, quantity: 10 })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('ORDER_INSUFFICIENT_BALANCE')
    })

    it('duas criações simultâneas não passam juntas', async () => {
      const { userId, token } = await userWith(150)

      const results = await Promise.all([order(token, openBuy(10)), order(token, openBuy(10))])

      expect(results.map((r) => r.statusCode).sort()).toEqual([200, 400])
      expect((await stateOf(userId)).openOrders).toBe(1)
    })
  })

  describe('venda', () => {
    async function userHolding(quantity: number) {
      const user = await userWith(10000)
      expect((await order(user.token, { side: 'BUY', type: 'MARKET', quantity })).statusCode).toBe(200)
      return user
    }

    it('acima da posição: 400 ORDER_INSUFFICIENT_POSITION e nada criado', async () => {
      const { userId, token } = await userHolding(2)

      const res = await order(token, openSell(3))

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('ORDER_INSUFFICIENT_POSITION')
      expect((await stateOf(userId)).openOrders).toBe(0)
    })

    it('duas que juntas passam da posição: a 2ª é recusada', async () => {
      const { userId, token } = await userHolding(2)

      expect((await order(token, openSell(2))).statusCode).toBe(200)
      const second = await order(token, openSell(2))

      expect(second.statusCode).toBe(400)
      expect(second.json().error).toBe('ORDER_INSUFFICIENT_POSITION')
      expect(await stateOf(userId)).toMatchObject({ positionQty: 2, openOrders: 1 })
    })

    it('ativo que não tem: 400 ORDER_INSUFFICIENT_POSITION', async () => {
      const { userId, token } = await userWith(10000)

      const res = await order(token, { side: 'SELL', type: 'STOP', price: 10, quantity: 1 })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('ORDER_INSUFFICIENT_POSITION')
      expect((await stateOf(userId)).openOrders).toBe(0)
    })

    it('a reserva é por ativo: venda OPEN de outro ativo não conta', async () => {
      const { token } = await userHolding(2)
      expect((await order(token, { ticker: 'PETR4', side: 'BUY', type: 'MARKET', quantity: 2 })).statusCode).toBe(200)

      expect((await order(token, { ...openSell(2), ticker: 'PETR4' })).statusCode).toBe(200)
      expect((await order(token, openSell(2))).statusCode).toBe(200)
    })

    it('duas criações simultâneas não passam juntas', async () => {
      const { userId, token } = await userHolding(2)

      const results = await Promise.all([order(token, openSell(2)), order(token, openSell(2))])

      expect(results.map((r) => r.statusCode).sort()).toEqual([200, 400])
      expect((await stateOf(userId)).openOrders).toBe(1)
    })
  })
})
