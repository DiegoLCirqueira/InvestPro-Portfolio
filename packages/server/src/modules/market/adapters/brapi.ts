// @investpro/server
// Fonte de dados: Brapi (ações brasileiras).
// Autenticação: Bearer token no header Authorization (método recomendado pela
// Brapi — a alternativa via query param `?token=` vaza pro histórico do
// navegador e logs de servidor, por isso evitamos). Sem BRAPI_API_KEY
// configurada, a chamada segue sem header e a Brapi responde 401 (fonte cai
// no fallback do market.service).

import type { MarketDataSource, MarketQuote, SourceAsset } from './types.js'
import { env } from '../../../config/env.js'

const BASE_URL = 'https://brapi.dev/api/quote'
const FETCH_TIMEOUT_MS = 5000

interface BrapiResult {
  symbol?: string
  shortName?: string | null
  regularMarketPrice?: number | null
  regularMarketChange?: number | null
  regularMarketChangePercent?: number | null
}

interface BrapiResponse {
  results?: BrapiResult[]
}

async function fetchJson(url: string): Promise<BrapiResponse> {
  const headers: Record<string, string> = env.BRAPI_API_KEY
    ? { Authorization: `Bearer ${env.BRAPI_API_KEY}` }
    : {}

  let response: Response
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  } catch (err) {
    throw new Error(`Brapi: falha de rede para ${url}: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!response.ok) {
    throw new Error(`Brapi: HTTP ${response.status} para ${url}`)
  }

  try {
    return (await response.json()) as BrapiResponse
  } catch (err) {
    throw new Error(`Brapi: resposta malformada de ${url}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const brapiSource: MarketDataSource = {
  source: 'brapi',

  async fetchQuotes(assets: SourceAsset[]): Promise<MarketQuote[]> {
    if (assets.length === 0) return []

    const symbols = assets.map((a) => a.remoteId ?? a.ticker).join(',')
    const data = await fetchJson(`${BASE_URL}/${symbols}`)

    const results = data.results ?? []
    if (results.length === 0) {
      throw new Error('Brapi: nenhum resultado retornado')
    }

    return results
      .filter((r) => typeof r.regularMarketPrice === 'number')
      .map((r) => {
        const asset = assets.find((a) => (a.remoteId ?? a.ticker) === r.symbol)
        return {
          ticker: r.symbol ?? asset?.ticker ?? 'DESCONHECIDO',
          name: r.shortName ?? asset?.name ?? '—',
          type: asset?.type ?? 'STOCK',
          price: r.regularMarketPrice ?? 0,
          change24h: r.regularMarketChange ?? 0,
          changePercent: r.regularMarketChangePercent ?? 0,
        }
      })
  },
}