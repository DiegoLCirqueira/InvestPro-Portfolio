// @investpro/server
// Testes do market.service: getAssets, getQuote, getHistory.
// Os adapters externos (Brapi/CoinGecko/AwesomeAPI) são mockados para a suite
// rodar determinística e offline; testamos a lógica de listagem, paginação,
// filtro, geração de histórico e fallback estático (quando o adapter falha).

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { brapiFetchQuotesMock, coingeckoFetchQuotesMock, awesomeapiFetchQuotesMock } = vi.hoisted(
  () => ({
    brapiFetchQuotesMock: vi.fn(),
    coingeckoFetchQuotesMock: vi.fn(),
    awesomeapiFetchQuotesMock: vi.fn(),
  })
)

vi.mock('../adapters/brapi.js', () => ({
  brapiSource: { source: 'brapi', fetchQuotes: brapiFetchQuotesMock },
}))
vi.mock('../adapters/coingecko.js', () => ({
  coingeckoSource: { source: 'coingecko', fetchQuotes: coingeckoFetchQuotesMock },
}))
vi.mock('../adapters/awesomeapi.js', () => ({
  awesomeapiSource: { source: 'awesomeapi', fetchQuotes: awesomeapiFetchQuotesMock },
}))

import { AppError } from '../auth/auth.service.js'
import { getAssets, getHistory, getQuote, refreshQuotes } from '../market.service.js'
import { cacheClear } from '../cache.js'
import { liveRates } from '../../exchange/exchange.rates.js'
import type { SourceAsset } from '../adapters/types.js'

// Brapi: sucesso para todos os ativos, exceto VALE3 (reservado para o teste de fallback).
brapiFetchQuotesMock.mockImplementation(async (assets: SourceAsset[]) => {
  if (assets.some((a) => a.ticker === 'VALE3')) {
    throw new Error('Brapi indisponível (mock)')
  }
  return assets.map((a) => ({
    ticker: a.ticker,
    name: a.name,
    type: a.type,
    price: 42.5,
    change24h: 1.1,
    changePercent: 1.2,
  }))
})

coingeckoFetchQuotesMock.mockImplementation(async (assets: SourceAsset[]) =>
  assets.map((a) => ({
    ticker: a.ticker,
    name: a.name,
    type: a.type,
    price: 400_000,
    change24h: 5000,
    changePercent: 1.3,
  }))
)

awesomeapiFetchQuotesMock.mockImplementation(async (assets: SourceAsset[]) =>
  assets.map((a) => ({
    ticker: a.ticker,
    name: a.name,
    type: a.type,
    price: 5.1,
    change24h: 0,
    changePercent: 0.4,
  }))
)

describe('getAssets', () => {
  it('lista ativos com paginação', async () => {
    const result = await getAssets({ page: 1, limit: 20 })
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.total).toBeGreaterThan(0)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('filtra por tipo de ativo', async () => {
    const result = await getAssets({ type: 'CRYPTO', page: 1, limit: 20 })
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.every((a) => a.type === 'CRYPTO')).toBe(true)
  })

  it('filtra por busca (ticker)', async () => {
    const result = await getAssets({ search: 'petr', page: 1, limit: 20 })
    expect(result.items.find((a) => a.ticker === 'PETR4')).toBeDefined()
  })

  it('respeita paginação', async () => {
    const page1 = await getAssets({ page: 1, limit: 2 })
    expect(page1.items).toHaveLength(2)
    const page2 = await getAssets({ page: 2, limit: 2 })
    expect(page2.items.length).toBeGreaterThanOrEqual(0)
  })
})

describe('getQuote', () => {
  it('lança ASSET_NOT_FOUND para ticker desconhecido', async () => {
    await expect(getQuote('XYZ9')).rejects.toMatchObject<AppError>({
      code: 'ASSET_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('retorna cotação com preço > 0 para ativo válido', async () => {
    const quote = await getQuote('PETR4')
    expect(quote.ticker).toBe('PETR4')
    expect(quote.price).toBeGreaterThan(0)
    expect(typeof quote.change).toBe('number')
  })

  it('usa fallback estático quando o adapter falha', async () => {
    const quote = await getQuote('VALE3')
    expect(quote.ticker).toBe('VALE3')
    expect(quote.price).toBe(62.75)
  })
})

// priceSource: 'live' = cotação da fonte externa (ou do cache dela); 'seed' = preço
// estático de referência (fonte falhou ou ainda não houve cotação). O frontend usa
// isso pra avisar que o preço não é uma cotação viva.
describe('priceSource', () => {
  it("getQuote: 'live' quando a fonte responde, 'seed' quando cai no fallback estático", async () => {
    cacheClear()

    expect((await getQuote('PETR4')).priceSource).toBe('live')
    expect((await getQuote('VALE3')).priceSource).toBe('seed') // brapi mockada falha só pra VALE3
  })

  it("o fallback fica marcado como 'seed' também nas leituras seguintes, vindas do cache", async () => {
    cacheClear()
    await getQuote('VALE3')

    expect((await getQuote('VALE3')).priceSource).toBe('seed')
  })

  it("getAssets: 'live' pro que tem cotação viva em cache; 'seed' pro fallback e pro que nunca foi cotado", async () => {
    cacheClear()
    await getQuote('PETR4') // live
    await getQuote('VALE3') // fallback (seed)

    const { items } = await getAssets({ page: 1, limit: 100 })
    const sourceOf = (ticker: string) => items.find((a) => a.ticker === ticker)?.priceSource

    expect(sourceOf('PETR4')).toBe('live')
    expect(sourceOf('VALE3')).toBe('seed')
    expect(sourceOf('BOVA11')).toBe('seed') // nenhuma cotação ainda: preço de seed
    expect(items.every((a) => a.priceSource === 'live' || a.priceSource === 'seed')).toBe(true)
  })
})

describe('getHistory', () => {
  it('gera série temporal com o número correto de pontos', async () => {
    const history = await getHistory('PETR4', { interval: '1d', limit: 7 })
    expect(history.ticker).toBe('PETR4')
    expect(history.points).toHaveLength(7)
    history.points.forEach((p) => {
      expect(p.price).toBeGreaterThanOrEqual(0)
      expect(typeof p.timestamp).toBe('string')
    })
  })

  it('gera 30 pontos para limit padrão', async () => {
    const history = await getHistory('BTC', { interval: '1d', limit: 30 })
    expect(history.points).toHaveLength(30)
  })

  it('lança ASSET_NOT_FOUND para ticker desconhecido', async () => {
    await expect(getHistory('NOPE', { interval: '1d', limit: 5 })).rejects.toMatchObject<AppError>({
      code: 'ASSET_NOT_FOUND',
      statusCode: 404,
    })
  })
})

// SELIC é um proxy de renda fixa cotado via AwesomeAPI pelo par USD-BRL (assets.ts)
// — o MESMO par que o câmbio (exchange.rates.ts) consulta. Antes da unificação, o
// scheduler (refreshQuotes) e o câmbio (liveRates) chamavam a AwesomeAPI cada um
// por conta própria pro mesmo par, dobrando o consumo do limite de requisições
// (incidente de 429 em produção). Estes testes provam que os dois caminhos agora
// compartilham o mesmo cache/provider: no máximo 1 chamada de rede por par.
describe('AwesomeAPI compartilhada entre o scheduler e o câmbio (USD-BRL)', () => {
  beforeEach(() => {
    liveRates.reset()
    cacheClear()
    awesomeapiFetchQuotesMock.mockClear()
  })

  it('scheduler primeiro, câmbio depois: 1 chamada de rede só, e o câmbio recebe a MESMA cotação', async () => {
    awesomeapiFetchQuotesMock.mockImplementationOnce(async (assets: SourceAsset[]) =>
      assets.map((a) => ({ ticker: a.ticker, name: a.ticker, type: 'FIXED_INCOME' as const, price: 5.5, change24h: 0, changePercent: 0 }))
    )

    await refreshQuotes() // scheduler (setInterval, em produção)
    const rateFromExchange = await liveRates.getRate('USD', 'BRL') // câmbio, sob demanda

    expect(rateFromExchange).toBe(5.5)
    expect(awesomeapiFetchQuotesMock).toHaveBeenCalledTimes(1)
  })

  it('câmbio primeiro, scheduler depois: 1 chamada de rede só, e o SELIC exibido reflete a cotação do câmbio', async () => {
    awesomeapiFetchQuotesMock.mockImplementationOnce(async () => [
      { ticker: 'USD-BRL', name: 'USD-BRL', type: 'FIXED_INCOME' as const, price: 5.2, change24h: 0, changePercent: 0 },
    ])

    await liveRates.getRate('USD', 'BRL')
    await refreshQuotes()

    expect(awesomeapiFetchQuotesMock).toHaveBeenCalledTimes(1)
    const selic = (await getAssets({ page: 1, limit: 100 })).items.find((a) => a.ticker === 'SELIC')
    expect(selic).toMatchObject({ price: 5.2, priceSource: 'live' })
  })

  it('scheduler e câmbio ao mesmo tempo (concorrentes): o single-flight já testado em exchange.rates ainda garante 1 única requisição', async () => {
    let resolveFetch: (quotes: unknown) => void = () => {}
    awesomeapiFetchQuotesMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFetch = resolve })
    )

    const schedulerCall = refreshQuotes()
    const exchangeCall = liveRates.getRate('USD', 'BRL')
    resolveFetch([{ ticker: 'USD-BRL', name: 'USD-BRL', type: 'FIXED_INCOME', price: 5.3, change24h: 0, changePercent: 0 }])
    const [, rateFromExchange] = await Promise.all([schedulerCall, exchangeCall])

    expect(rateFromExchange).toBe(5.3)
    expect(awesomeapiFetchQuotesMock).toHaveBeenCalledTimes(1)
  })

  it('cotação servida do cache continua marcada como live (não seed) — a garantia de segurança de exchange.rates não muda', async () => {
    awesomeapiFetchQuotesMock.mockImplementationOnce(async () => [
      { ticker: 'USD-BRL', name: 'USD-BRL', type: 'FIXED_INCOME' as const, price: 5.4, change24h: 0, changePercent: 0 },
    ])

    await refreshQuotes()
    awesomeapiFetchQuotesMock.mockClear()
    await refreshQuotes() // dentro do freshTtl: reaproveita o cache, sem nova chamada de rede

    expect(awesomeapiFetchQuotesMock).not.toHaveBeenCalled()
    const selic = (await getAssets({ page: 1, limit: 100 })).items.find((a) => a.ticker === 'SELIC')
    expect(selic).toMatchObject({ price: 5.4, priceSource: 'live' })
  })
})