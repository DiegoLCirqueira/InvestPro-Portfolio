// @investpro/server
// Testes de INTEGRAÇÃO da reserva das ordens OPEN contra o PostgreSQL real:
// tudo que usa o saldo em conta (compra a mercado, Caixinha, câmbio,
// transferência) ou vende posição só usa o que está livre. getQuote e a
// AwesomeAPI são mockados; cada cenário usa um usuário novo.

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
  uniqueCpf,
  uniqueEmail,
  uniqueIp,
} from '../../../test/integration.helpers.js'

const { getQuoteMock, awesomeapiFetchQuotesMock } = vi.hoisted(() => ({
  getQuoteMock: vi.fn(),
  awesomeapiFetchQuotesMock: vi.fn(),
}))

vi.mock('../../market/market.service.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../market/market.service.js')>()
  return { ...mod, getQuote: getQuoteMock }
})

vi.mock('../../market/adapters/awesomeapi.js', () => ({
  awesomeapiSource: { source: 'awesomeapi', fetchQuotes: awesomeapiFetchQuotesMock },
}))

let app: FastifyInstance | undefined
const emails: string[] = []

beforeAll(async () => {
  app = await startApp()
  // Mercado a R$ 25: LIMIT BUY a R$ 20 e LIMIT SELL a R$ 30 ficam OPEN.
  getQuoteMock.mockImplementation(async (ticker: string): Promise<Quote> => {
    return { ticker, price: 25, change: 0, changePercent: 0 }
  })
  awesomeapiFetchQuotesMock.mockImplementation(async (assets: Array<{ ticker: string }>) =>
    assets.map((a) => ({ ticker: a.ticker, name: a.ticker, type: 'FIXED_INCOME' as const, price: 5, change24h: 0, changePercent: 0 }))
  )
})

afterAll(async () => {
  await stopApp(app)
  await Promise.all(emails.map(deleteUser))
})

function post(token: string, url: string, payload: Record<string, unknown>) {
  return app!.inject({
    method: 'POST',
    url,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    remoteAddress: uniqueIp(),
    payload,
  })
}

const order = (token: string, payload: Record<string, unknown>) =>
  post(token, '/api/v1/orders', { ticker: 'VALE3', type: 'MARKET', ...payload })

// Saldo R$ 1.000 com uma LIMIT BUY OPEN de 40 × R$ 20 + 1% = R$ 808 reservados:
// sobram R$ 192 livres.
async function userWithReservedBalance() {
  const email = uniqueEmail('order-reserve')
  emails.push(email)
  const reg = await registerTestUser(app!, email, uniqueCpf())
  const userId = reg.body.user.id as string
  const token = reg.body.accessToken as string
  await fundPortfolio(userId, 1000)
  const limit = await order(token, { side: 'BUY', type: 'LIMIT', price: 20, quantity: 40 })
  expect(limit.json().status).toBe('OPEN')
  return { userId, token }
}

async function balanceOf(userId: string): Promise<number> {
  const portfolio = await prisma.portfolio.findUniqueOrThrow({ where: { userId } })
  return portfolio.balance.toNumber()
}

function expectInsufficient(res: Awaited<ReturnType<typeof post>>, code: string) {
  expect(res.statusCode).toBe(400)
  expect(res.json().error).toBe(code)
  expect(res.json().message).toMatch(/R\$\s808,00 reservados em ordens abertas/)
}

describe('reserva das ordens OPEN', () => {
  it('compra a mercado não usa o saldo reservado', async () => {
    const { userId, token } = await userWithReservedBalance()

    // 8 × 25 + 1% = 202 > 192 livres
    expectInsufficient(await order(token, { side: 'BUY', quantity: 8 }), 'ORDER_INSUFFICIENT_BALANCE')
    expect(await balanceOf(userId)).toBe(1000)

    // 7 × 25 + 1% = 176,75 cabe
    expect((await order(token, { side: 'BUY', quantity: 7 })).statusCode).toBe(200)
    expect(await balanceOf(userId)).toBe(823.25)
  })

  it('com useSavingsBox, a Caixinha cobre a diferença em relação ao saldo livre', async () => {
    const { userId, token } = await userWithReservedBalance()
    await prisma.savingsBox.create({ data: { userId, balance: 500 } })

    // 10 × 25 + 1% = 252,50; livres 192 -> resgata 60,50
    const res = await order(token, { side: 'BUY', quantity: 10, useSavingsBox: true })

    expect(res.statusCode).toBe(200)
    expect(res.json().savingsBoxUsed).toBe(60.5)
    expect(await balanceOf(userId)).toBe(808) // sobra exatamente o reservado
    const box = await prisma.savingsBox.findUniqueOrThrow({ where: { userId } })
    expect(box.balance.toNumber()).toBe(439.5)
  })

  it('venda a mercado não vende a posição reservada', async () => {
    const { token } = await userWithReservedBalance()
    expect((await order(token, { side: 'BUY', quantity: 6 })).statusCode).toBe(200)
    expect((await order(token, { side: 'SELL', type: 'LIMIT', price: 30, quantity: 4 })).json().status).toBe('OPEN')

    const tooMuch = await order(token, { side: 'SELL', quantity: 3 }) // 6 - 4 reservadas = 2 livres
    expect(tooMuch.statusCode).toBe(400)
    expect(tooMuch.json().error).toBe('ORDER_INSUFFICIENT_POSITION')

    expect((await order(token, { side: 'SELL', quantity: 2 })).statusCode).toBe(200)
  })

  it('depósito na Caixinha respeita a reserva', async () => {
    const { userId, token } = await userWithReservedBalance()

    expectInsufficient(await post(token, '/api/v1/savings-box/deposit', { amount: 193 }), 'PORTFOLIO_INSUFFICIENT_BALANCE')
    expect((await post(token, '/api/v1/savings-box/deposit', { amount: 192 })).statusCode).toBe(200)
    expect(await balanceOf(userId)).toBe(808)
  })

  it('câmbio saindo de BRL respeita a reserva', async () => {
    const { userId, token } = await userWithReservedBalance()

    expectInsufficient(
      await post(token, '/api/v1/exchange/execute', { from: 'BRL', to: 'USD', amount: 193 }),
      'PORTFOLIO_INSUFFICIENT_BALANCE'
    )
    expect(await balanceOf(userId)).toBe(1000)
  })

  it('transferência respeita a reserva', async () => {
    const { userId, token } = await userWithReservedBalance()

    expectInsufficient(
      await post(token, '/api/v1/transfers', { type: 'PIX', pixKey: 'qa-pix@investpro.com', amount: 193 }),
      'TRANSFER_INSUFFICIENT_BALANCE'
    )
    expect(await balanceOf(userId)).toBe(1000)
  })
})
