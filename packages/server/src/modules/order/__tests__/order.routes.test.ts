// @investpro/server
// Testes de INTEGRAÇÃO das rotas autenticadas de ordens contra o PostgreSQL real.
// O market.service.getQuote é mockado para evitar chamadas reais de rede (brapi/
// coingecko). Usa um usuário de teste novo (store em memória isolado por userId).

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import {
  deleteUser,
  fundPortfolio,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
  uniqueIp,
} from '../../../test/integration.helpers.js'
import { calculateOrderFee } from '../order.domain.js'

// Espelha o cálculo real de custo/proceeds de order.service.ts (fee de 1% soma
// no BUY, desconta no SELL) — evita duplicar/hardcodar a fórmula em cada teste.
function buyCost(quantity: number, price: number): number {
  const total = quantity * price
  return Math.round((total + calculateOrderFee(total)) * 100) / 100
}
function sellProceeds(quantity: number, price: number): number {
  const total = quantity * price
  return Math.round((total - calculateOrderFee(total)) * 100) / 100
}

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
  await fundPortfolio(reg.body.user.id, 10000)
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
    // FILLED (MARKET sempre preenche): fee de 1% sobre 10 * 20 = 200 -> 2.
    expect(body.fee).toBe(2)
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

describe('GET /api/v1/orders/sellable-assets', () => {
  it('retorna só os tickers com posição ativa (quantity > 0), não o catálogo de mercado', async () => {
    // O usuário deste describe comprou 10 VALE3 no teste do topo do arquivo.
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/orders/sellable-assets',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.items).toEqual([{ ticker: 'VALE3', quantity: 10 }])
  })

  it('usuário sem nenhuma posição recebe lista vazia (não 404)', async () => {
    const freshEmail = uniqueEmail('order-sellable-empty')
    const reg = await registerTestUser(app!, freshEmail)

    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/orders/sellable-assets',
      headers: { authorization: `Bearer ${reg.body.accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().items).toEqual([])

    await deleteUser(freshEmail)
  }, 15000) // register+delete contra o Postgres real: acima do timeout default de 5s

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/orders/sellable-assets' })
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
      await fundPortfolio(reg.body.user.id, 100000)
    })

    afterAll(async () => {
      await deleteUser(flowEmail)
    })

    it('BUY sem posição prévia cria Position e decrementa balance (com fee de 1%)', async () => {
      mockQuote(20)
      const res = await createOrder(flowToken, {
        ticker: 'VALE3',
        side: 'BUY',
        quantity: 10,
        type: 'MARKET',
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('FILLED')
      expect(res.json().fee).toBe(2) // 1% de 10*20=200

      const portfolio = await getPortfolioOf(flowToken)
      const position = portfolio.positions.find((p) => p.ticker === 'VALE3')
      expect(position).toBeTruthy()
      expect(position?.quantity).toBe(10)
      expect(position?.avgPrice).toBe(20) // fee não entra no avgPrice
      expect(position?.currentValue).toBe(200)
      expect(portfolio.balance).toBeCloseTo(100000 - buyCost(10, 20), 2)
    })

    it('BUY incremental recalcula avgPrice e decrementa balance de novo', async () => {
      const before = await getPortfolioOf(flowToken)

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
      expect(portfolio.balance).toBeCloseTo(before.balance - buyCost(10, 30), 2)
    })

    it('BUY LIMIT que fica OPEN não altera Position nem balance, fee vem null', async () => {
      const before = await getPortfolioOf(flowToken)

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
      expect(res.json().fee).toBeNull()

      const portfolio = await getPortfolioOf(flowToken)
      const position = portfolio.positions.find((p) => p.ticker === 'VALE3')
      expect(position?.quantity).toBe(20)
      expect(position?.avgPrice).toBe(25)
      expect(portfolio.balance).toBe(before.balance)
    })

    it('BUY que excede o saldo disponível é rejeitada (400 ORDER_INSUFFICIENT_BALANCE), sem alterar Position/balance', async () => {
      const before = await getPortfolioOf(flowToken)
      const totalBefore = await ordersTotalOf(flowToken)

      mockQuote(1000000) // 1 unidade já custa mais que o saldo restante
      const res = await createOrder(flowToken, {
        ticker: 'VALE3',
        side: 'BUY',
        quantity: 1,
        type: 'MARKET',
      })
      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('ORDER_INSUFFICIENT_BALANCE')

      const after = await getPortfolioOf(flowToken)
      expect(after).toEqual(before)
      expect(await ordersTotalOf(flowToken)).toBe(totalBefore)
    })

    it('BUY dentro do saldo disponível continua executando normalmente', async () => {
      const before = await getPortfolioOf(flowToken)

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
      expect(after.balance).toBeCloseTo(before.balance - buyCost(1, 100), 2)
    })

    it('SELL com posição suficiente reduz quantity e incrementa balance (com fee de 1%), avgPrice mantido', async () => {
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
      expect(res.json().fee).toBe(2) // 1% de 5*40=200

      const after = await getPortfolioOf(flowToken)
      const positionAfter = after.positions.find((p) => p.ticker === 'VALE3')
      expect(positionAfter?.quantity).toBeCloseTo(positionBefore.quantity - 5, 8)
      expect(positionAfter?.avgPrice).toBe(positionBefore.avgPrice)
      expect(after.balance).toBeCloseTo(before.balance + sellProceeds(5, 40), 2)
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
      expect(after.balance).toBeCloseTo(before.balance + sellProceeds(positionBefore.quantity, 45), 2)
    })
  })

  describe('SELL com posição insuficiente não altera Position/balance nem cria Order', () => {
    let email = ''
    let token = ''

    beforeAll(async () => {
      email = uniqueEmail('order-sell-insuf')
      const reg = await registerTestUser(app!, email)
      token = reg.body.accessToken as string
      await fundPortfolio(reg.body.user.id, 1000)

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

  // Segurança: o preço informado em LIMIT/STOP só decide SE executa. A execução
  // é sempre a preço de mercado — antes, STOP BUY a 0,01 comprava a 0,01 e
  // STOP SELL a 1e6 creditava qty*1e6. Mercado mockado em 20 em todos os casos.
  describe('preço de execução de LIMIT/STOP é o de mercado', () => {
    let priceEmail = ''
    let priceToken = ''

    beforeAll(async () => {
      priceEmail = uniqueEmail('order-price')
      const reg = await registerTestUser(app!, priceEmail)
      priceToken = reg.body.accessToken as string
      await fundPortfolio(reg.body.user.id, 1000)
    })

    afterAll(async () => {
      await deleteUser(priceEmail)
    })

    it('STOP BUY com gatilho de R$ 0,10 executa a R$ 20 e cobra 10*20 + 1% = 202', async () => {
      mockQuote(20)
      const res = await createOrder(priceToken, {
        ticker: 'VALE3',
        side: 'BUY',
        quantity: 10,
        type: 'STOP',
        price: 0.1, // 10 * 0,10 = R$ 1,00: no mínimo por ordem
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ status: 'FILLED', price: 20, avgPrice: 20, fee: 2 })

      const portfolio = await getPortfolioOf(priceToken)
      expect(portfolio.balance).toBe(798) // 1000 - 202 (e não 1000 - 1,00 - fee)
      expect(portfolio.positions.find((p) => p.ticker === 'VALE3')).toMatchObject({
        quantity: 10,
        avgPrice: 20,
      })
    })

    it('LIMIT BUY com limite de R$ 30 e mercado a R$ 20 executa a R$ 20 (melhor preço)', async () => {
      mockQuote(20)
      const res = await createOrder(priceToken, {
        ticker: 'VALE3',
        side: 'BUY',
        quantity: 5,
        type: 'LIMIT',
        price: 30,
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ status: 'FILLED', price: 20, avgPrice: 20, fee: 1 })

      const portfolio = await getPortfolioOf(priceToken)
      expect(portfolio.balance).toBe(697) // 798 - (5*20 + 1)
      expect(portfolio.positions.find((p) => p.ticker === 'VALE3')?.quantity).toBe(15)
    })

    it('STOP SELL com gatilho absurdo (1.000.000) executa a R$ 20 e credita 5*20 - 1% = 99', async () => {
      mockQuote(20)
      const res = await createOrder(priceToken, {
        ticker: 'VALE3',
        side: 'SELL',
        quantity: 5,
        type: 'STOP',
        price: 1_000_000,
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ status: 'FILLED', price: 20, fee: 1 })

      const portfolio = await getPortfolioOf(priceToken)
      expect(portfolio.balance).toBe(796) // 697 + 99 (e não + 5*1e6)
      expect(portfolio.positions.find((p) => p.ticker === 'VALE3')?.quantity).toBe(10)
    })

    it('LIMIT SELL com limite de R$ 10 e mercado a R$ 20 executa a R$ 20 (melhor preço)', async () => {
      mockQuote(20)
      const res = await createOrder(priceToken, {
        ticker: 'VALE3',
        side: 'SELL',
        quantity: 5,
        type: 'LIMIT',
        price: 10,
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ status: 'FILLED', price: 20, fee: 1 })

      const portfolio = await getPortfolioOf(priceToken)
      expect(portfolio.balance).toBe(895) // 796 + 99
      expect(portfolio.positions.find((p) => p.ticker === 'VALE3')?.quantity).toBe(5)
    })

    it('ordem com total que arredonda para R$ 0,00 é recusada (400) sem criar Order nem mexer no saldo', async () => {
      const totalBefore = await ordersTotalOf(priceToken)

      mockQuote(20)
      // Cripto: ação não aceita fração na compra, e o que se testa aqui é o total que zera.
      const res = await createOrder(priceToken, {
        ticker: 'BTC',
        side: 'BUY',
        quantity: 0.00000001, // 1e-8 * 20 = 2e-7 -> R$ 0,00
        type: 'MARKET',
      })
      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('ORDER_TOTAL_TOO_SMALL')

      expect((await getPortfolioOf(priceToken)).balance).toBe(895)
      expect(await ordersTotalOf(priceToken)).toBe(totalBefore)
    })

    it('compra fracionada de ação é recusada (400 ORDER_INVALID) sem criar Order', async () => {
      const totalBefore = await ordersTotalOf(priceToken)

      mockQuote(20)
      const stock = await createOrder(priceToken, { ticker: 'VALE3', side: 'BUY', quantity: 1.5, type: 'MARKET' })
      expect(stock.statusCode).toBe(400)
      expect(stock.json().error).toBe('ORDER_INVALID')
      expect(stock.json().message).toMatch(/quantidade inteira/)
      expect(await ordersTotalOf(priceToken)).toBe(totalBefore)
      expect((await getPortfolioOf(priceToken)).balance).toBe(895)
    })

    it.each([
      ['quantidade com 12 casas decimais', 0.123456789012],
      ['quantidade acima do teto (1e21)', 1e21],
    ])('%s retorna 400 VALIDATION_ERROR (não 500)', async (_name, quantity) => {
      const res = await createOrder(priceToken, {
        ticker: 'VALE3',
        side: 'BUY',
        quantity,
        type: 'MARKET',
      })
      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')
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
