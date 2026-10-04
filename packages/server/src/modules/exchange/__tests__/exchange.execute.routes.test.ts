// @investpro/server
// Testes de INTEGRAÇÃO de POST /api/v1/exchange/execute (câmbio de verdade,
// diferente de /convert que só calcula) contra o PostgreSQL real. A AwesomeAPI
// é mockada (mesmo padrão de exchange.service.test.ts) pra ter valores
// determinísticos. O execute NÃO usa o fallback estático: um par ausente do
// mock (ex.: AUD) responde 503 EXCHANGE_RATE_UNAVAILABLE.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
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

const { awesomeapiFetchQuotesMock } = vi.hoisted(() => ({
  awesomeapiFetchQuotesMock: vi.fn(),
}))

vi.mock('../../market/adapters/awesomeapi.js', () => ({
  awesomeapiSource: { source: 'awesomeapi', fetchQuotes: awesomeapiFetchQuotesMock },
}))

const MOCKED_RATES: Record<string, number> = {
  'USD-BRL': 5,
  'EUR-BRL': 6,
  'GBP-BRL': 7,
  'CHF-BRL': 5.6,
  'JPY-BRL': 0.034,
}

awesomeapiFetchQuotesMock.mockImplementation(async (assets: Array<{ ticker: string }>) => {
  const pair = assets[0]?.ticker ?? ''
  const price = MOCKED_RATES[pair]
  if (price === undefined) {
    throw new Error(`AwesomeAPI indisponível (mock) para o par ${pair}`)
  }
  return assets.map((a) => ({ ticker: a.ticker, name: a.ticker, type: 'FIXED_INCOME' as const, price, change24h: 0, changePercent: 0 }))
})

let app: FastifyInstance | undefined
let email = ''
let token = ''
let userId = ''

async function execute(payload: Record<string, unknown>) {
  return app!.inject({
    method: 'POST',
    url: '/api/v1/exchange/execute',
    headers: { authorization: `Bearer ${token}` },
    remoteAddress: uniqueIp(), // rate limit de escrita é 10/min por IP
    payload,
  })
}

async function getPortfolioBalance(): Promise<number> {
  const res = await app!.inject({
    method: 'GET',
    url: '/api/v1/portfolio',
    headers: { authorization: `Bearer ${token}` },
  })
  return res.json().balance as number
}

beforeAll(async () => {
  app = await startApp()
  email = uniqueEmail('exchange-exec')
  const reg = await registerTestUser(app, email)
  token = reg.body.accessToken as string
  userId = reg.body.user.id as string
  await fundPortfolio(userId, 1000)
})

afterAll(async () => {
  await stopApp(app)
  await deleteUser(email)
})

describe('POST /api/v1/exchange/execute', () => {
  it('BRL -> USD: debita o portfolio e credita o CurrencyHolding (fee de 1%)', async () => {
    const res = await execute({ from: 'BRL', to: 'USD', amount: 1000 })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    // rate BRL->USD = 1/5 = 0.2 (par mockado é USD-BRL=5, invertido)
    expect(body.rate).toBeCloseTo(0.2, 8)
    expect(body.fee).toBe(10) // 1% de 1000 BRL
    expect(body.convertedAmount).toBe(198) // (1000-10)*0.2

    expect(await getPortfolioBalance()).toBe(0) // 1000 - 1000

    const holdings = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio', // sanity: portfolio não guarda moeda estrangeira
      headers: { authorization: `Bearer ${token}` },
    })
    expect(holdings.json().positions).toEqual([])
  })

  it('USD -> BRL: debita o CurrencyHolding criado acima e credita o portfolio', async () => {
    const res = await execute({ from: 'USD', to: 'BRL', amount: 100 })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.rate).toBe(5) // par direto USD-BRL
    expect(body.fee).toBe(1) // 1% de 100 USD
    expect(body.convertedAmount).toBe(495) // (100-1)*5

    expect(await getPortfolioBalance()).toBe(495)
  })

  it('retorna 400 PORTFOLIO_INSUFFICIENT_BALANCE se BRL não for suficiente, sem alterar nada', async () => {
    const before = await getPortfolioBalance()

    const res = await execute({ from: 'BRL', to: 'USD', amount: 999999 })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('PORTFOLIO_INSUFFICIENT_BALANCE')
    expect(await getPortfolioBalance()).toBe(before)
  })

  it('retorna 400 CURRENCY_HOLDING_INSUFFICIENT_BALANCE se a moeda estrangeira não for suficiente', async () => {
    // Holding de USD restante: 98 (198 criado - 100 já convertido de volta).
    const res = await execute({ from: 'USD', to: 'BRL', amount: 999999 })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('CURRENCY_HOLDING_INSUFFICIENT_BALANCE')
  })

  it('retorna 400 CURRENCY_HOLDING_INSUFFICIENT_BALANCE pra moeda sem holding nenhum (EUR)', async () => {
    const res = await execute({ from: 'EUR', to: 'BRL', amount: 10 })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('CURRENCY_HOLDING_INSUFFICIENT_BALANCE')
  })

  it('holding com deletedAt não conta como saldo: 400 e o registro fica intacto', async () => {
    await prisma.currencyHolding.create({
      data: { userId, currency: 'GBP', balance: 100, deletedAt: new Date() },
    })

    const res = await execute({ from: 'GBP', to: 'BRL', amount: 10 })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('CURRENCY_HOLDING_INSUFFICIENT_BALANCE')

    const holding = await prisma.currencyHolding.findUnique({
      where: { userId_currency: { userId, currency: 'GBP' } },
    })
    expect(holding?.balance.toNumber()).toBe(100)
  })

  it('não cria dinheiro: amount fracionado (0.004) é barrado e nenhum saldo muda', async () => {
    const portfolioBefore = await getPortfolioBalance()
    const usdBefore = await prisma.currencyHolding.findUnique({
      where: { userId_currency: { userId, currency: 'USD' } },
    })

    const res = await execute({ from: 'BRL', to: 'USD', amount: 0.004 })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('VALIDATION_ERROR')

    const usdAfter = await prisma.currencyHolding.findUnique({
      where: { userId_currency: { userId, currency: 'USD' } },
    })
    expect(await getPortfolioBalance()).toBe(portfolioBefore)
    expect(usdAfter?.balance.toNumber()).toBe(usdBefore?.balance.toNumber())
  })

  it('retorna 400 EXCHANGE_SAME_CURRENCY quando from === to', async () => {
    const res = await execute({ from: 'BRL', to: 'BRL', amount: 10 })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('EXCHANGE_SAME_CURRENCY')
  })

  // Antes rodava sem CHF no mock, caindo no fallback estático do serviço — o que
  // codificava o bug (execute com taxa inventada). Agora CHF-BRL é cotação viva
  // mockada, e o valor convertido é exato: (10 - 1%) / 5,6 = 1,7678 -> 1,76.
  it('BRL -> CHF: moeda que antes só a calculadora aceitava, agora executa de verdade (enum ampliado pras 9)', async () => {
    const before = await getPortfolioBalance()

    const res = await execute({ from: 'BRL', to: 'CHF', amount: 10 })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.fromCurrency).toBe('BRL')
    expect(body.toCurrency).toBe('CHF')
    expect(body.rate).toBeCloseTo(1 / 5.6, 8)
    expect(body.fee).toBeCloseTo(0.1, 8) // 1% de 10 BRL
    expect(body.convertedAmount).toBe(1.76)

    expect(await getPortfolioBalance()).toBeCloseTo(before - 10, 2)
  })

  it('sem cotação viva (AwesomeAPI indisponível pro par) retorna 503 EXCHANGE_RATE_UNAVAILABLE, sem fallback e sem alterar saldos', async () => {
    const before = await getPortfolioBalance()

    const res = await execute({ from: 'BRL', to: 'AUD', amount: 10 }) // AUD ausente do mock
    expect(res.statusCode).toBe(503)
    expect(res.json().error).toBe('EXCHANGE_RATE_UNAVAILABLE')
    expect(await getPortfolioBalance()).toBe(before)
  })

  it('crédito é arredondado pra BAIXO: BRL 10,02 -> JPY dá ¥291 (arredondar pro mais próximo daria ¥292)', async () => {
    const before = await getPortfolioBalance()

    // (10,02 - 1%) * (1 / 0,034) = 291,7588... -> 291
    const res = await execute({ from: 'BRL', to: 'JPY', amount: 10.02 })
    expect(res.statusCode).toBe(200)
    expect(res.json().convertedAmount).toBe(291)

    expect(await getPortfolioBalance()).toBeCloseTo(before - 10.02, 2)
    const jpy = await prisma.currencyHolding.findUnique({
      where: { userId_currency: { userId, currency: 'JPY' } },
    })
    expect(jpy?.balance.toNumber()).toBe(291)
  })

  it('não cria dinheiro por arredondamento: BRL 0,02 -> JPY seria ¥1 (arredondando), agora 400 EXCHANGE_AMOUNT_TOO_SMALL', async () => {
    const portfolioBefore = await getPortfolioBalance()

    // (0,02 - 1%) * (1 / 0,034) = 0,58 -> 0 (antes virava ¥1, que volta como R$ 0,03)
    const res = await execute({ from: 'BRL', to: 'JPY', amount: 0.02 })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('EXCHANGE_AMOUNT_TOO_SMALL')

    expect(await getPortfolioBalance()).toBe(portfolioBefore)
    const jpy = await prisma.currencyHolding.findUnique({
      where: { userId_currency: { userId, currency: 'JPY' } },
    })
    expect(jpy?.balance.toNumber()).toBe(291) // intacto (do teste anterior)
  })

  it('retorna 400 (validação) para moeda que nem a calculadora suporta', async () => {
    const res = await execute({ from: 'BRL', to: 'XYZ', amount: 10 })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/exchange/execute',
      payload: { from: 'BRL', to: 'USD', amount: 10 },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /api/v1/exchange/execute — mínimo de R$ 1,00 por conversão', () => {
  let minEmail = ''
  let minToken = ''
  let minUserId = ''

  beforeAll(async () => {
    minEmail = uniqueEmail('exchange-min')
    const reg = await registerTestUser(app!, minEmail)
    minToken = reg.body.accessToken as string
    minUserId = reg.body.user.id as string
    await fundPortfolio(minUserId, 100)
    await prisma.currencyHolding.create({ data: { userId: minUserId, currency: 'USD', balance: 10 } })
  })

  afterAll(async () => {
    await deleteUser(minEmail)
  })

  function executeAs(payload: Record<string, unknown>) {
    return app!.inject({
      method: 'POST',
      url: '/api/v1/exchange/execute',
      headers: { authorization: `Bearer ${minToken}` },
      remoteAddress: uniqueIp(),
      payload,
    })
  }

  it('BRL de origem: R$ 0,99 recusa sem mexer em nada, R$ 1,00 executa', async () => {
    const tooSmall = await executeAs({ from: 'BRL', to: 'USD', amount: 0.99 })
    expect(tooSmall.statusCode).toBe(400)
    expect(tooSmall.json()).toEqual({ error: 'EXCHANGE_AMOUNT_TOO_SMALL', message: 'O valor mínimo por conversão é R$ 1,00' })
    expect((await prisma.portfolio.findUniqueOrThrow({ where: { userId: minUserId } })).balance.toNumber()).toBe(100)

    expect((await executeAs({ from: 'BRL', to: 'USD', amount: 1 })).statusCode).toBe(200)
  })

  it('moeda estrangeira de origem vale pela cotação: US$ 0,19 (R$ 0,95) recusa, US$ 0,20 (R$ 1,00) executa', async () => {
    const tooSmall = await executeAs({ from: 'USD', to: 'BRL', amount: 0.19 })
    expect(tooSmall.statusCode).toBe(400)
    expect(tooSmall.json().error).toBe('EXCHANGE_AMOUNT_TOO_SMALL')

    expect((await executeAs({ from: 'USD', to: 'BRL', amount: 0.2 })).statusCode).toBe(200)
  })
})
