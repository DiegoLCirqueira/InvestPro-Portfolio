// @investpro/server
// Testes de INTEGRAÇÃO das rotas autenticadas de ordens contra o PostgreSQL real.
// O market.service.getQuote é mockado para evitar chamadas reais de rede (brapi/
// coingecko). Usa um usuário de teste novo (store em memória isolado por userId).

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import {
  deleteUser,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
  uniqueIp,
} from '../../../test/integration.helpers.js'

const { getQuoteMock } = vi.hoisted(() => {
  return {
    getQuoteMock: vi.fn(),
  }
})

vi.mock('../../market/market.service.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../market/market.service.js')>()
  return { ...mod, getQuote: getQuoteMock }
})

import type { Quote } from '@investpro/shared'

let app: FastifyInstance | undefined
let email = ''
let token = ''

beforeAll(async () => {
  app = await startApp()
  email = uniqueEmail('order')
  const reg = await registerTestUser(app, email)
  token = reg.body.accessToken as string
  getQuoteMock.mockReset()
  getQuoteMock.mockImplementation(async (ticker: string): Promise<Quote> => {
    return { ticker, price: 20, change: 0, changePercent: 0 }
  })
})

afterAll(async () => {
  await stopApp(app)
  await deleteUser(email)
})

describe('POST /api/v1/orders', () => {
  it('cria ordem MARKET BUY e executa (200 FILLED)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { ticker: 'VALE3', side: 'BUY', quantity: 10, type: 'MARKET' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.ticker).toBe('VALE3')
    expect(body.side).toBe('BUY')
    expect(body.type).toBe('MARKET')
    expect(body.quantity).toBe(10)
    expect(['FILLED', 'OPEN', 'PENDING']).toContain(body.status)
    expect(body.id).toBeTruthy()
    expect(getQuoteMock).toHaveBeenCalledWith('VALE3')
  })

  it('retorna 400 para ordem inválida (quantidade negativa)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { ticker: 'VALE3', side: 'BUY', quantity: -5, type: 'MARKET' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/orders',
      remoteAddress: uniqueIp(),
      payload: { ticker: 'VALE3', side: 'BUY', quantity: 1, type: 'MARKET' },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/v1/orders', () => {
  it('lista as ordens do usuário (200)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/orders?page=1&limit=10',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(body.total).toBeGreaterThanOrEqual(1)
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/orders' })
    expect(res.statusCode).toBe(401)
  })
})

// WI-12: ordem FILLED atualiza Position e Portfolio.balance atomicamente.
// Verificado como black-box HTTP via GET /api/v1/portfolio (sem acessar o
// Prisma diretamente no teste) — cada cenário confere o efeito de criar a
// ordem sobre a posição e o saldo do portfólio do usuário autenticado.
describe('POST /api/v1/orders — execução FILLED atualiza Position/Portfolio', () => {
  function mockQuote(price: number) {
    getQuoteMock.mockImplementationOnce(async (ticker: string): Promise<Quote> => {
      return { ticker, price, change: 0, changePercent: 0 }
    })
  }

  interface PortfolioPositionView {
    ticker: string
    quantity: number
    avgPrice: number
    currentValue: number
  }
  interface PortfolioView {
    balance: number
    positions: PortfolioPositionView[]
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

  async function createOrder(userToken: string, payload: Record<string, unknown>) {
    return app!.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload,
    })
  }

  async function ordersTotalOf(userToken: string): Promise<number> {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/orders?page=1&limit=100',
      headers: { authorization: `Bearer ${userToken}` },
      remoteAddress: uniqueIp(),
    })
    expect(res.statusCode).toBe(200)
    return res.json().total as number
  }

  describe('fluxo BUY -> BUY incremental -> LIMIT OPEN -> balance negativo -> SELL parcial -> SELL zera', () => {
    let flowEmail = ''
    let flowToken = ''

    beforeAll(async () => {
      flowEmail = uniqueEmail('order-flow')
      const reg = await registerTestUser(app!, flowEmail)
      flowToken = reg.body.accessToken as string
    })

    afterAll(async () => {
      await deleteUser(flowEmail)
    })

    it('BUY sem posição prévia cria Position e decrementa balance', async () => {
      mockQuote(20)
      const res = await createOrder(flowToken, {
        ticker: 'VALE3',
        side: 'BUY',
        quantity: 10,
        type: 'MARKET',
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('FILLED')

      const portfolio = await getPortfolioOf(flowToken)
      const position = portfolio.positions.find((p) => p.ticker === 'VALE3')
      expect(position).toBeTruthy()
      expect(position?.quantity).toBe(10)
      expect(position?.avgPrice).toBe(20)
      expect(position?.currentValue).toBe(200)
      expect(portfolio.balance).toBe(-200)
    })

    it('BUY incremental recalcula avgPrice e decrementa balance de novo', async () => {
      mockQuote(30)
      const res = await createOrder(flowToken, {
        ticker: 'VALE3',
        side: 'BUY',
        quantity: 10,
        type: 'MARKET',
      })
      expect(res.statusCode).toBe(200)

      const portfolio = await getPortfolioOf(flowToken)
      const position = portfolio.positions.find((p) => p.ticker === 'VALE3')
      // (20*10 + 30*10) / 20 = 25
      expect(position?.quantity).toBe(20)
      expect(position?.avgPrice).toBe(25)
      expect(position?.currentValue).toBe(500)
      expect(portfolio.balance).toBe(-500)
    })

    it('BUY LIMIT que fica OPEN não altera Position nem balance', async () => {
      mockQuote(50) // mercado 50 > limite 15 -> BUY LIMIT não executa
      const res = await createOrder(flowToken, {
        ticker: 'VALE3',
        side: 'BUY',
        quantity: 5,
        type: 'LIMIT',
        price: 15,
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('OPEN')

      const portfolio = await getPortfolioOf(flowToken)
      const position = portfolio.positions.find((p) => p.ticker === 'VALE3')
      expect(position?.quantity).toBe(20)
      expect(position?.avgPrice).toBe(25)
      expect(portfolio.balance).toBe(-500)
    })

    it('BUY com balance já negativo executa normalmente sem erro (sem checagem de saldo nesta fase)', async () => {
      const before = await getPortfolioOf(flowToken)
      expect(before.balance).toBeLessThan(0)

      mockQuote(100)
      const res = await createOrder(flowToken, {
        ticker: 'VALE3',
        side: 'BUY',
        quantity: 1,
        type: 'MARKET',
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('FILLED')

      const after = await getPortfolioOf(flowToken)
      const position = after.positions.find((p) => p.ticker === 'VALE3')
      expect(position?.quantity).toBe(21)
      expect(after.balance).toBe(before.balance - 100)
    })

    it('SELL com posição suficiente reduz quantity e incrementa balance, avgPrice mantido', async () => {
      const before = await getPortfolioOf(flowToken)
      const positionBefore = before.positions.find((p) => p.ticker === 'VALE3')
      if (!positionBefore) throw new Error('posição VALE3 ausente antes da venda')

      mockQuote(40)
      const res = await createOrder(flowToken, {
        ticker: 'VALE3',
        side: 'SELL',
        quantity: 5,
        type: 'MARKET',
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('FILLED')

      const after = await getPortfolioOf(flowToken)
      const positionAfter = after.positions.find((p) => p.ticker === 'VALE3')
      expect(positionAfter?.quantity).toBeCloseTo(positionBefore.quantity - 5, 8)
      expect(positionAfter?.avgPrice).toBe(positionBefore.avgPrice)
      expect(after.balance).toBeCloseTo(before.balance + 200, 2)
    })

    it('SELL que zera a posição remove a Position da resposta', async () => {
      const before = await getPortfolioOf(flowToken)
      const positionBefore = before.positions.find((p) => p.ticker === 'VALE3')
      if (!positionBefore) throw new Error('posição VALE3 ausente antes da venda final')

      mockQuote(45)
      const res = await createOrder(flowToken, {
        ticker: 'VALE3',
        side: 'SELL',
        quantity: positionBefore.quantity,
        type: 'MARKET',
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('FILLED')

      const after = await getPortfolioOf(flowToken)
      expect(after.positions.find((p) => p.ticker === 'VALE3')).toBeUndefined()
      expect(after.balance).toBeCloseTo(before.balance + positionBefore.quantity * 45, 2)
    })
  })

  describe('SELL com posição insuficiente não altera Position/balance nem cria Order', () => {
    let email = ''
    let token = ''

    beforeAll(async () => {
      email = uniqueEmail('order-sell-insuf')
      const reg = await registerTestUser(app!, email)
      token = reg.body.accessToken as string

      mockQuote(10)
      const buy = await createOrder(token, { ticker: 'VALE3', side: 'BUY', quantity: 5, type: 'MARKET' })
      expect(buy.statusCode).toBe(200)
    })

    afterAll(async () => {
      await deleteUser(email)
    })

    it('SELL maior que a posição retorna 400 ORDER_INSUFFICIENT_POSITION sem criar Order nem alterar Position/balance', async () => {
      const before = await getPortfolioOf(token)
      const totalBefore = await ordersTotalOf(token)

      mockQuote(10)
      const res = await createOrder(token, { ticker: 'VALE3', side: 'SELL', quantity: 999, type: 'MARKET' })
      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('ORDER_INSUFFICIENT_POSITION')

      const after = await getPortfolioOf(token)
      expect(after).toEqual(before)
      expect(await ordersTotalOf(token)).toBe(totalBefore)
    })

    it('SELL LIMIT que fica OPEN não altera Position nem balance', async () => {
      const before = await getPortfolioOf(token)

      mockQuote(10) // mercado 10 < limite 1000 -> SELL LIMIT não executa
      const res = await createOrder(token, { ticker: 'VALE3', side: 'SELL', quantity: 1, type: 'LIMIT', price: 1000 })
      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('OPEN')

      const after = await getPortfolioOf(token)
      expect(after).toEqual(before)
    })
  })

  describe('SELL sem nenhuma posição prévia', () => {
    let email = ''
    let token = ''

    beforeAll(async () => {
      email = uniqueEmail('order-sell-nopos')
      const reg = await registerTestUser(app!, email)
      token = reg.body.accessToken as string
    })

    afterAll(async () => {
      await deleteUser(email)
    })

    it('retorna 400 ORDER_INSUFFICIENT_POSITION sem criar Order', async () => {
      const totalBefore = await ordersTotalOf(token)

      mockQuote(10)
      const res = await createOrder(token, { ticker: 'VALE3', side: 'SELL', quantity: 1, type: 'MARKET' })
      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('ORDER_INSUFFICIENT_POSITION')

      const portfolio = await getPortfolioOf(token)
      expect(portfolio.positions.find((p) => p.ticker === 'VALE3')).toBeUndefined()
      expect(await ordersTotalOf(token)).toBe(totalBefore)
    })
  })
})
