// @investpro/server
// Refresh de cotações sob demanda (serverless, sem scheduler): cache vencido
// busca uma vez só, mesmo com chamadas simultâneas; cache fresco não busca.
// Adapters mockados, sem rede.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { brapiFetchQuotesMock, coingeckoFetchQuotesMock, awesomeapiFetchQuotesMock } = vi.hoisted(() => ({
  brapiFetchQuotesMock: vi.fn(),
  coingeckoFetchQuotesMock: vi.fn(),
  awesomeapiFetchQuotesMock: vi.fn(),
}))

vi.mock('../adapters/brapi.js', () => ({
  brapiSource: { source: 'brapi', fetchQuotes: brapiFetchQuotesMock },
}))
vi.mock('../adapters/coingecko.js', () => ({
  coingeckoSource: { source: 'coingecko', fetchQuotes: coingeckoFetchQuotesMock },
}))
vi.mock('../adapters/awesomeapi.js', () => ({
  awesomeapiSource: { source: 'awesomeapi', fetchQuotes: awesomeapiFetchQuotesMock },
}))

import { getQuote, refreshQuotes, refreshQuotesIfStale } from '../market.service.js'
import { cacheClear, QUOTE_TTL_MS } from '../cache.js'
import { liveRates } from '../../exchange/exchange.rates.js'
import type { SourceAsset } from '../adapters/types.js'

// Responde num tick seguinte, pra as chamadas simultâneas se sobreporem de verdade.
const quotesFor = (price: number) => async (assets: SourceAsset[]) => {
  await new Promise((resolve) => setTimeout(resolve, 5))
  return assets.map((a) => ({ ticker: a.ticker, name: a.name, type: a.type, price, change24h: 0, changePercent: 0 }))
}

beforeEach(() => {
  cacheClear()
  liveRates.reset()
  for (const mock of [brapiFetchQuotesMock, coingeckoFetchQuotesMock, awesomeapiFetchQuotesMock]) {
    mock.mockReset().mockImplementation(quotesFor(10))
  }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('refreshQuotesIfStale', () => {
  it('cache vencido: chamadas simultâneas fazem uma busca só por fonte', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(Date.now() + 10 * QUOTE_TTL_MS) // garante a última busca vencida

    await Promise.all([refreshQuotesIfStale(), refreshQuotesIfStale(), refreshQuotesIfStale()])

    expect(brapiFetchQuotesMock).toHaveBeenCalledTimes(1)
    expect(coingeckoFetchQuotesMock).toHaveBeenCalledTimes(1)
  })

  it('cache fresco não busca; depois do TTL busca de novo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(Date.now() + 20 * QUOTE_TTL_MS)
    await refreshQuotesIfStale()
    expect(brapiFetchQuotesMock).toHaveBeenCalledTimes(1)

    await refreshQuotesIfStale()
    expect(brapiFetchQuotesMock).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + QUOTE_TTL_MS)
    await refreshQuotesIfStale()
    expect(brapiFetchQuotesMock).toHaveBeenCalledTimes(2)
  })

  it('refresh do scheduler em andamento é compartilhado com quem pede pela lista', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(Date.now() + 30 * QUOTE_TTL_MS)

    await Promise.all([refreshQuotes(), refreshQuotesIfStale()])

    expect(brapiFetchQuotesMock).toHaveBeenCalledTimes(1)
  })
})

describe('getQuote', () => {
  it('ticker sem cache: pedidos simultâneos fazem uma busca só e recebem o mesmo preço', async () => {
    brapiFetchQuotesMock.mockImplementation(quotesFor(37.5))

    const quotes = await Promise.all([getQuote('PETR4'), getQuote('petr4'), getQuote('PETR4')])

    expect(brapiFetchQuotesMock).toHaveBeenCalledTimes(1)
    expect(quotes.map((q) => q.price)).toEqual([37.5, 37.5, 37.5])
  })

  it('cotação fresca no cache não busca de novo', async () => {
    await getQuote('PETR4')
    await getQuote('PETR4')

    expect(brapiFetchQuotesMock).toHaveBeenCalledTimes(1)
  })
})
