// @investpro/server
// Fonte de dados: AwesomeAPI (câmbio / renda fixa proxy, via remoteId do par, ex. USDBRL).
// Decisões v1.1 designam AwesomeAPI como fonte de câmbio/fixed income.

import type { MarketDataSource, MarketQuote, SourceAsset } from './types.js'

const BASE_URL = 'https://economia.awesomeapi.com.br/json/last'
const FETCH_TIMEOUT_MS = 5000

interface AwesomeApiEntry {
  bid?: string
  pctChange?: string | null
}

async function fetchJson(url: string): Promise<Record<string, AwesomeApiEntry>> {
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  } catch (err) {
    throw new Error(`AwesomeAPI: falha de rede para ${url}: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!response.ok) {
    throw new Error(`AwesomeAPI: HTTP ${response.status} para ${url}`)
  }

  try {
    return (await response.json()) as Record<string, AwesomeApiEntry>
  } catch (err) {
    throw new Error(`AwesomeAPI: resposta malformada de ${url}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const awesomeapiSource: MarketDataSource = {
  source: 'awesomeapi',

  async fetchQuotes(assets: SourceAsset[]): Promise<MarketQuote[]> {
    if (assets.length === 0) return []

    const pairs = assets.map((a) => a.remoteId ?? a.ticker).join(',')
    const data = await fetchJson(`${BASE_URL}/${pairs}`)

    const quotes: MarketQuote[] = []
    for (const asset of assets) {
      const pair = asset.remoteId ?? asset.ticker
      const raw = data[pair]
      if (!raw || typeof raw.bid !== 'string') continue
      quotes.push({
        ticker: asset.ticker,
        name: asset.name,
        type: asset.type,
        price: Number.parseFloat(raw.bid),
        change24h: 0,
        changePercent: raw.pctChange ? Number.parseFloat(raw.pctChange) : 0,
      })
    }

    if (quotes.length === 0) {
      throw new Error('AwesomeAPI: nenhuma cotação retornada')
    }
    return quotes
  },
}