// @investpro/server
// Testes de INTEGRAÇÃO de POST /api/v1/orders/:id/cancel contra o PostgreSQL
// real. getQuote é mockado (R$ 20); cada cenário usa um usuário novo.

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
  getQuoteMock.mockImplementation(async (ticker: string): Promise<Quote> => {
    return { ticker, price: 20, change: 0, changePercent: 0 }
  })
})

afterAll(async () => {
  await stopApp(app)
  await Promise.all(emails.map(deleteUser))
})

async function newUser(balance = 1000) {
  const email = uniqueEmail('order-cancel')
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
    payload: { ticker: 'VALE3', type: 'MARKET', ...payload },
  })
}

function cancel(token: string, orderId: string) {
  return app!.inject({
    method: 'POST',
    url: `/api/v1/orders/${orderId}/cancel`,
    headers: { authorization: `Bearer ${token}` },
    remoteAddress: uniqueIp(),
  })
}

async function reservationsOf(token: string) {
  const res = await app!.inject({
    method: 'GET',
    url: '/api/v1/orders/reservations',
    headers: { authorization: `Bearer ${token}` },
    remoteAddress: uniqueIp(),
  })
  return res.json()
}

// LIMIT BUY a R$ 10 com mercado a R$ 20 fica OPEN: 90 × 10 + 1% = 909 reservados.
async function openBuy(token: string): Promise<string> {
  const res = await order(token, { side: 'BUY', type: 'LIMIT', price: 10, quantity: 90 })
  expect(res.json().status).toBe('OPEN')
  return res.json().id as string
}

describe('POST /api/v1/orders/:id/cancel', () => {
  it('a dona cancela a OPEN (200 CANCELLED) e a reserva fica livre na hora', async () => {
    const { token } = await newUser()
    const id = await openBuy(token)
    // Com 909 reservados, 10 × 20 + 1% = 202 não cabe nos 91 livres.
    expect((await order(token, { side: 'BUY', quantity: 10 })).statusCode).toBe(400)

    const res = await cancel(token, id)

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id, status: 'CANCELLED' })
    expect(await reservationsOf(token)).toEqual({ balance: 0, positions: {} })
    expect((await order(token, { side: 'BUY', quantity: 10 })).statusCode).toBe(200)
  })

  it('cancelar uma venda OPEN libera a posição', async () => {
    const { token } = await newUser()
    expect((await order(token, { side: 'BUY', quantity: 5 })).statusCode).toBe(200)
    const sell = await order(token, { side: 'SELL', type: 'LIMIT', price: 30, quantity: 5 })
    expect((await order(token, { side: 'SELL', quantity: 1 })).statusCode).toBe(400)

    expect((await cancel(token, sell.json().id as string)).statusCode).toBe(200)

    expect((await order(token, { side: 'SELL', quantity: 1 })).statusCode).toBe(200)
  })

  it('PENDING também pode ser cancelada', async () => {
    const { userId, token } = await newUser()
    const pending = await prisma.order.create({
      data: { userId, assetId: 'VALE3', ticker: 'VALE3', side: 'BUY', type: 'LIMIT', quantity: 1, price: 10, status: 'PENDING' },
    })

    const res = await cancel(token, pending.id)

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('CANCELLED')
  })

  it('ordem de outra conta: 404 ORDER_NOT_FOUND e continua OPEN', async () => {
    const owner = await newUser()
    const other = await newUser()
    const id = await openBuy(owner.token)

    const res = await cancel(other.token, id)

    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('ORDER_NOT_FOUND')
    expect((await prisma.order.findUniqueOrThrow({ where: { id } })).status).toBe('OPEN')
  })

  it('id inexistente: 404 ORDER_NOT_FOUND', async () => {
    const { token } = await newUser()

    const res = await cancel(token, '00000000-0000-0000-0000-000000000000')

    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('ORDER_NOT_FOUND')
  })

  it('ordem executada ou já cancelada: 409 ORDER_NOT_CANCELLABLE', async () => {
    const { token } = await newUser()
    const filled = await order(token, { side: 'BUY', quantity: 1 })
    expect(filled.json().status).toBe('FILLED')
    const open = await openBuy(token)
    expect((await cancel(token, open)).statusCode).toBe(200)

    for (const id of [filled.json().id as string, open]) {
      const res = await cancel(token, id)
      expect(res.statusCode).toBe(409)
      expect(res.json().error).toBe('ORDER_NOT_CANCELLABLE')
    }
  })

  it('duas chamadas simultâneas: uma 200, a outra 409', async () => {
    const { token } = await newUser()
    const id = await openBuy(token)

    const results = await Promise.all([cancel(token, id), cancel(token, id)])

    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409])
  })

  it('exige autenticação', async () => {
    const res = await app!.inject({ method: 'POST', url: '/api/v1/orders/qualquer/cancel' })
    expect(res.statusCode).toBe(401)
  })
})
