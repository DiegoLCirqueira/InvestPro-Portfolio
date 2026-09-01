// @investpro/server
// Fonte de dados: CoinGecko (criptomoedas, via remoteId do coin id).

import type { MarketDataSource, MarketQuote, SourceAsset } from './types.js'

const BASE_URL = 'https://api.coingecko.com/api/v3/simple/price'
const FETCH_TIMEOUT_MS = 5000

interface CoinGeckoEntry {
  brl?: number
  brl_24h_change?: number | null
}

async function fetchJson(url: string): Promise<Record<string, CoinGeckoEntry>> {
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  } catch (err) {
    throw new Error(`CoinGecko: falha de rede para ${url}: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!response.ok) {
    throw new Error(`CoinGecko: HTTP ${response.status} para ${url} (rate limit ou indisponível)`)
  }

  try {
    return (await response.json()) as Record<string, CoinGeckoEntry>
  } catch (err) {
    throw new Error(`CoinGecko: resposta malformada de ${url}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const coingeckoSource: MarketDataSource = {
  source: 'coingecko',

  async fetchQuotes(assets: SourceAsset[]): Promise<MarketQuote[]> {
    if (assets.length === 0) return []

    const ids = assets.map((a) => a.remoteId ?? a.ticker).join(',')
    const data = await fetchJson(
      `${BASE_URL}?ids=${ids}&vs_currencies=brl&include_24hr_change=true`
    )

    const quotes: MarketQuote[] = []
    for (const asset of assets) {
      const id = asset.remoteId ?? asset.ticker
      const raw = data[id]
      if (!raw || typeof raw.brl !== 'number') continue
      quotes.push({
        ticker: asset.ticker,
        name: asset.name,
        type: asset.type,
        price: raw.brl,
        change24h: raw.brl_24h_change ?? 0,
        changePercent: raw.brl_24h_change ?? 0,
      })
    }

    if (quotes.length === 0) {
      throw new Error('CoinGecko: nenhuma cotação retornada')
    }
    return quotes
  },
}