// @investpro/server
// Testes de INTEGRAÇÃO: o histórico de ordens mostra exatamente o que se moveu
// no saldo (preço com 4+ casas, taxa e total gravados na execução), contra o
// PostgreSQL real. getQuote é mockado; cada cenário usa um usuário novo.

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
  // O caso do QA: cotação com 4 casas, que o Decimal(15,2) cortava pra 4,99.
  getQuoteMock.mockImplementation(async (ticker: string): Promise<Quote> => {
    return { ticker, price: 4.9918, change: 0, changePercent: 0 }
  })
})

afterAll(async () => {
  await stopApp(app)
  await Promise.all(emails.map(deleteUser))
})

async function newUser(balance: number) {
  const email = uniqueEmail('order-settle')
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

async function historyOf(token: string) {
  const res = await app!.inject({
    method: 'GET',
    url: '/api/v1/orders?page=1&limit=100',
    headers: { authorization: `Bearer ${token}` },
    remoteAddress: uniqueIp(),
  })
  return res.json().items as Array<Record<string, unknown>>
}

const balanceOf = async (userId: string) =>
  (await prisma.portfolio.findUniqueOrThrow({ where: { userId } })).balance.toNumber()

describe('histórico de ordens = o que foi liquidado', () => {
  it('compra e venda a 4,9918 × 300: preço cheio, taxa e total iguais ao débito/crédito', async () => {
    const { userId, token } = await newUser(2000)

    // 300 × 4,9918 = 1.497,54; + 1% = 1.512,5154 -> debita 1.512,52 (taxa 14,98)
    const buy = await order(token, { side: 'BUY', quantity: 300 })
    expect(buy.json()).toMatchObject({ status: 'FILLED', price: 4.9918, fee: 14.98, netAmount: 1512.52 })
    expect(await balanceOf(userId)).toBe(487.48) // 2.000 - 1.512,52

    // 1.497,54 - 1% = 1.482,5646 -> credita 1.482,56 (taxa 14,98)
    const sell = await order(token, { side: 'SELL', quantity: 300 })
    expect(sell.json()).toMatchObject({ status: 'FILLED', price: 4.9918, fee: 14.98, netAmount: 1482.56 })
    expect(await balanceOf(userId)).toBe(1970.04) // 487,48 + 1.482,56

    // O GET devolve o mesmo que a execução, não um recálculo.
    const history = await historyOf(token)
    expect(history).toEqual([
      expect.objectContaining({ side: 'BUY', price: 4.9918, fee: 14.98, netAmount: 1512.52 }),
      expect.objectContaining({ side: 'SELL', price: 4.9918, fee: 14.98, netAmount: 1482.56 }),
    ])
  })

  it('ordem antiga, sem fee/netAmount gravados: taxa estimada como antes e sem total (o preço antigo foi cortado)', async () => {
    const { userId, token } = await newUser(0)
    await prisma.order.create({
      data: {
        userId, assetId: 'VALE3', ticker: 'VALE3', side: 'BUY', type: 'MARKET',
        quantity: 300, price: 4.99, status: 'FILLED', avgPrice: 4.99, executedAt: new Date(),
      },
    })

    const [legacy] = await historyOf(token)

    // 300 × 4,99 = 1.497,00; taxa 14,97. Sem netAmount: recalculá-lo do preço cortado
    // podia divergir do débito real.
    expect(legacy).toMatchObject({ price: 4.99, fee: 14.97 })
    expect(legacy).not.toHaveProperty('netAmount')
  })

  it('ordem OPEN não tem taxa nem total liquidado', async () => {
    const { token } = await newUser(1000)

    const open = await order(token, { side: 'BUY', type: 'LIMIT', price: 4, quantity: 10 })

    expect(open.json().status).toBe('OPEN')
    expect(open.json().fee).toBeNull()
    expect(open.json()).not.toHaveProperty('netAmount')
  })
})
