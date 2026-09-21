// @investpro/server
// Testes do market.service: getAssets, getQuote, getHistory.
// Os adapters externos (Brapi/CoinGecko/AwesomeAPI) são mockados para a suite
// rodar determinística e offline; testamos a lógica de listagem, paginação,
// filtro, geração de histórico e fallback estático (quando o adapter falha).

import { describe, expect, it, vi } from 'vitest'

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
import { getAssets, getHistory, getQuote } from '../market.service.js'
import { cacheClear } from '../cache.js'
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