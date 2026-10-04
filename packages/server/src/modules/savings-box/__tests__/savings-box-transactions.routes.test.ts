// @investpro/server
// Testes de INTEGRAÇÃO do extrato da caixinha (GET /api/v1/savings-box/transactions)
// contra o PostgreSQL real. getQuote é mockado (R$ 20) pra compra com a Caixinha.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { Quote } from '@investpro/shared'
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

async function newUser(balance: number) {
  const email = uniqueEmail('savings-tx')
  emails.push(email)
  const reg = await registerTestUser(app!, email)
  await fundPortfolio(reg.body.user.id as string, balance)
  return reg.body.accessToken as string
}

function post(token: string, url: string, payload: Record<string, unknown>) {
  return app!.inject({
    method: 'POST',
    url,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    remoteAddress: uniqueIp(),
    payload,
  })
}

function transactions(token: string, query = '') {
  return app!.inject({
    method: 'GET',
    url: `/api/v1/savings-box/transactions${query}`,
    headers: { authorization: `Bearer ${token}` },
    remoteAddress: uniqueIp(),
  })
}

describe('GET /api/v1/savings-box/transactions', () => {
  it('depósito, resgate e compra com a Caixinha geram a linha certa, mais recentes primeiro', async () => {
    const token = await newUser(500)

    expect((await post(token, '/api/v1/savings-box/deposit', { amount: 300 })).statusCode).toBe(200)
    expect((await post(token, '/api/v1/savings-box/withdraw', { amount: 100 })).statusCode).toBe(200)
    // Saldo 300; compra de 20 × 20 + 1% = 404 resgata 104 da Caixinha.
    const buy = await post(token, '/api/v1/orders', {
      ticker: 'VALE3', side: 'BUY', type: 'MARKET', quantity: 20, useSavingsBox: true,
    })
    expect(buy.json().savingsBoxUsed).toBe(104)
    // Operação recusada não deixa linha.
    expect((await post(token, '/api/v1/savings-box/withdraw', { amount: 1000 })).statusCode).toBe(400)

    const res = await transactions(token)

    expect(res.statusCode).toBe(200)
    expect(res.json().nextCursor).toBeNull()
    expect(res.json().items).toMatchObject([
      { type: 'ORDER_FUNDING', amount: 104, balanceAfter: 96, orderId: buy.json().id },
      { type: 'WITHDRAW', amount: 100, balanceAfter: 200, orderId: null },
      { type: 'DEPOSIT', amount: 300, balanceAfter: 300, orderId: null },
    ])
    expect(Number.isNaN(Date.parse(res.json().items[0].createdAt))).toBe(false)
  })

  it('pagina por cursor sem repetir nem pular movimentos', async () => {
    const token = await newUser(1000)
    for (const amount of [1, 2, 3, 4, 5]) {
      expect((await post(token, '/api/v1/savings-box/deposit', { amount })).statusCode).toBe(200)
    }

    const amounts: number[] = []
    let cursor: string | null = null
    let pages = 0
    do {
      const res = await transactions(token, `?limit=2${cursor ? `&cursor=${cursor}` : ''}`)
      expect(res.statusCode).toBe(200)
      amounts.push(...res.json().items.map((t: { amount: number }) => t.amount))
      cursor = res.json().nextCursor
      pages += 1
    } while (cursor)

    expect(pages).toBe(3)
    expect(amounts).toEqual([5, 4, 3, 2, 1])
  })

  it('só mostra os movimentos da própria conta', async () => {
    const owner = await newUser(1000)
    const other = await newUser(1000)
    expect((await post(owner, '/api/v1/savings-box/deposit', { amount: 50 })).statusCode).toBe(200)

    const res = await transactions(other)

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ items: [], nextCursor: null })
  })

  it('cursor inválido: 400 VALIDATION_ERROR', async () => {
    const token = await newUser(0)

    const res = await transactions(token, '?cursor=nao-e-um-cursor')

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('VALIDATION_ERROR')
  })

  it('exige autenticação', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/savings-box/transactions' })
    expect(res.statusCode).toBe(401)
  })
})
