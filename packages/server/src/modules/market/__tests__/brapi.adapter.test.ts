// @investpro/server
// Adapter Brapi com fetch stubado (offline). Sem token, a Brapi recusa o lote
// inteiro com 401 se um único ticker exigir token: os tickers livres não podem
// cair junto no preço estimado.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockEnv = vi.hoisted(() => ({ BRAPI_API_KEY: '' }))
vi.mock('../../../config/env.js', () => ({ env: mockEnv }))

import { brapiSource, resetBrapiTokenRequiredCache } from '../adapters/brapi.js'
import type { SourceAsset } from '../adapters/types.js'

const asset = (ticker: string): SourceAsset => ({ id: ticker, ticker, name: ticker, type: 'STOCK' })
const ASSETS = ['PETR4', 'VALE3', 'BOVA11'].map(asset)
const FREE = new Set(['PETR4', 'VALE3'])

// Simula a Brapi sem token: lote com ticker pago = 401; ticker livre = 200.
function stubBrapiWithoutToken() {
  const fetchMock = vi.fn(async (url: string) => {
    const symbols = url.split('/').pop()!.split(',')
    if (!symbols.every((symbol) => FREE.has(symbol))) {
      return new Response(JSON.stringify({ error: true, code: 'MISSING_TOKEN' }), { status: 401 })
    }
    return new Response(
      JSON.stringify({ results: symbols.map((symbol) => ({ symbol, regularMarketPrice: 10 })) })
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  resetBrapiTokenRequiredCache()
  mockEnv.BRAPI_API_KEY = ''
})
afterEach(() => vi.unstubAllGlobals())

describe('brapiSource.fetchQuotes sem token', () => {
  it('lote recusado por um ticker pago: devolve os tickers livres em vez de derrubar todos', async () => {
    stubBrapiWithoutToken()
    const quotes = await brapiSource.fetchQuotes(ASSETS)
    expect(quotes.map((q) => q.ticker).sort()).toEqual(['PETR4', 'VALE3'])
  })

  it('lembra o ticker que exige token: o ciclo seguinte é 1 requisição só com os livres', async () => {
    const fetchMock = stubBrapiWithoutToken()
    await brapiSource.fetchQuotes(ASSETS)
    fetchMock.mockClear()

    const quotes = await brapiSource.fetchQuotes(ASSETS)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/PETR4,VALE3$/)
    expect(quotes).toHaveLength(2)
  })

  it('só tickers que exigem token: erro claro (cai no preço estimado)', async () => {
    stubBrapiWithoutToken()
    await expect(brapiSource.fetchQuotes([asset('BOVA11')])).rejects.toThrow(/401/)
  })

  it('limite de rajada (429) na tentativa ticker a ticker: para e fica com o que já veio, sem marcar como pago', async () => {
    let call = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        call++
        if (call === 1) return new Response('{}', { status: 401 })
        if (call === 2) return new Response(JSON.stringify({ results: [{ symbol: 'PETR4', regularMarketPrice: 10 }] }))
        return new Response('{}', { status: 429 })
      })
    )
    const quotes = await brapiSource.fetchQuotes(ASSETS)
    expect(quotes.map((q) => q.ticker)).toEqual(['PETR4'])
    expect(call).toBe(3)
  })

  it('falha que não é 401 (ex.: 500) não vira tentativa ticker a ticker', async () => {
    const fetchMock = vi.fn(async () => new Response('erro', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(brapiSource.fetchQuotes(ASSETS)).rejects.toThrow(/500/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

// Brapi com token no plano gratuito: 1 ativo por requisição (lote com token
// dá 400 QUOTES_PER_REQUEST_EXCEEDED) e 15 mil requisições por mês.
function stubBrapiWithToken() {
  const calls: Array<{ symbols: string[]; withToken: boolean }> = []
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const symbols = url.split('/').pop()!.split(',')
    const withToken = Boolean((init?.headers as Record<string, string> | undefined)?.Authorization)
    calls.push({ symbols, withToken })
    if (withToken && symbols.length > 1) return new Response('{"code":"QUOTES_PER_REQUEST_EXCEEDED"}', { status: 400 })
    if (!withToken && !symbols.every((symbol) => FREE.has(symbol))) return new Response('{}', { status: 401 })
    return new Response(JSON.stringify({ results: symbols.map((symbol) => ({ symbol, regularMarketPrice: 20 })) }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

describe('brapiSource.fetchQuotes com token (plano gratuito)', () => {
  beforeEach(() => {
    mockEnv.BRAPI_API_KEY = 'chave-teste'
  })

  it('livres em lote anônimo (sem gastar cota); o pago com token, sozinho: todos ao vivo', async () => {
    const calls = stubBrapiWithToken()
    const quotes = await brapiSource.fetchQuotes(ASSETS)

    expect(quotes.map((q) => q.ticker).sort()).toEqual(['BOVA11', 'PETR4', 'VALE3'])
    expect(calls.filter((c) => c.withToken)).toEqual([{ symbols: ['BOVA11'], withToken: true }])
    expect(calls.every((c) => !c.withToken || c.symbols.length === 1)).toBe(true)
  })

  it('o ticker pago é buscado com token no máximo a cada 5 min; entre as buscas vale a última cotação real', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const calls = stubBrapiWithToken()
    await brapiSource.fetchQuotes(ASSETS)
    calls.length = 0

    vi.setSystemTime(Date.now() + 60_000)
    const nextCycle = await brapiSource.fetchQuotes(ASSETS)
    expect(calls.filter((c) => c.withToken)).toHaveLength(0)
    expect(nextCycle.map((q) => q.ticker)).toContain('BOVA11')

    vi.setSystemTime(Date.now() + 5 * 60_000)
    await brapiSource.fetchQuotes(ASSETS)
    expect(calls.filter((c) => c.withToken)).toEqual([{ symbols: ['BOVA11'], withToken: true }])
    vi.useRealTimers()
  })
})
