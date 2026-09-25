// @investpro/server
// Adapter Brapi com fetch stubado (offline). Sem token, a Brapi recusa o lote
// inteiro com 401 se um único ticker exigir token: os tickers livres não podem
// cair junto no preço estimado.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../config/env.js', () => ({ env: { BRAPI_API_KEY: '' } }))

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

beforeEach(() => resetBrapiTokenRequiredCache())
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
