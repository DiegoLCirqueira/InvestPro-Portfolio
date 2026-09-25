// @investpro/server
// Fonte de dados: Brapi (ações brasileiras).
// Autenticação: Bearer token no header Authorization (método recomendado pela
// Brapi — a alternativa via query param `?token=` vaza pro histórico do
// navegador e logs de servidor, por isso evitamos). O token só é enviado para
// os tickers que o exigem; os livres vão em lote anônimo (ver abaixo).

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

class BrapiHttpError extends Error {
  constructor(
    public readonly status: number,
    url: string
  ) {
    super(`Brapi: HTTP ${status} para ${url}`)
  }
}

// Sem token, a Brapi libera só algumas ações (ex.: PETR4, VALE3, ITUB4) e
// recusa o LOTE inteiro com 401 se um único ticker exigir token (ex.: BOVA11)
// — derrubando todas para o preço estimado. Tickers que exigem token ficam de
// fora dos lotes anônimos por um tempo, pra não tentar a cada minuto.
const TOKEN_REQUIRED_TTL_MS = 6 * 60 * 60 * 1000
const tokenRequiredUntil = new Map<string, number>()

// Com token, o plano gratuito aceita só 1 ativo por requisição e 15 mil
// requisições por mês: os tickers que exigem token são buscados um a um e no
// máximo a cada 5 minutos (~8,6 mil/mês por ticker); entre uma busca e outra,
// vale a última cotação real. Os tickers livres seguem no lote anônimo, que
// não gasta a cota da conta.
const TOKEN_REFRESH_MS = 5 * 60 * 1000
const tokenQuotes = new Map<string, { result: BrapiResult; fetchedAt: number }>()

export function resetBrapiTokenRequiredCache(): void {
  tokenRequiredUntil.clear()
  tokenQuotes.clear()
}

const symbolOf = (asset: SourceAsset): string => asset.remoteId ?? asset.ticker

async function fetchResults(assets: SourceAsset[], withToken = false): Promise<BrapiResult[]> {
  const data = await fetchJson(`${BASE_URL}/${assets.map(symbolOf).join(',')}`, withToken)
  return data.results ?? []
}

const requiresToken = (asset: SourceAsset): boolean =>
  (tokenRequiredUntil.get(symbolOf(asset)) ?? 0) > Date.now()

async function fetchWithToken(assets: SourceAsset[]): Promise<BrapiResult[]> {
  if (!env.BRAPI_API_KEY) return []

  const results: BrapiResult[] = []
  for (const asset of assets) {
    const symbol = symbolOf(asset)
    const cached = tokenQuotes.get(symbol)
    if (cached && Date.now() - cached.fetchedAt < TOKEN_REFRESH_MS) {
      results.push(cached.result)
      continue
    }
    try {
      const [result] = await fetchResults([asset], true)
      if (result) {
        tokenQuotes.set(symbol, { result, fetchedAt: Date.now() })
        results.push(result)
      }
    } catch {
      if (cached) results.push(cached.result)
    }
  }
  return results
}

// Lote recusado por 401: descobre, um a um e em sequência, quais tickers
// funcionam sem token. Sem token a Brapi também limita rajadas (429): em
// paralelo, um ticker pago pode levar 429 em vez de 401 e nunca ser marcado.
// No 429, para e fica com o que já veio; o próximo ciclo continua.
async function fetchEachSeparately(assets: SourceAsset[]): Promise<BrapiResult[]> {
  const results: BrapiResult[] = []
  for (const asset of assets) {
    try {
      results.push(...(await fetchResults([asset])))
    } catch (err) {
      if (!(err instanceof BrapiHttpError)) continue
      if (err.status === 429) break
      if (err.status === 401) tokenRequiredUntil.set(symbolOf(asset), Date.now() + TOKEN_REQUIRED_TTL_MS)
    }
  }
  return results
}

async function fetchAnonymous(assets: SourceAsset[]): Promise<BrapiResult[]> {
  if (assets.length === 0) return []
  try {
    return await fetchResults(assets)
  } catch (err) {
    const batchUnauthorized = err instanceof BrapiHttpError && err.status === 401 && assets.length > 1
    if (!batchUnauthorized) throw err
    return fetchEachSeparately(assets)
  }
}

// Anônimo primeiro (pode descobrir, neste ciclo, quais tickers exigem token);
// depois, com token, só os que exigem.
async function fetchAvailable(assets: SourceAsset[]): Promise<BrapiResult[]> {
  let anonymousError: unknown
  let anonymous: BrapiResult[] = []
  try {
    anonymous = await fetchAnonymous(assets.filter((asset) => !requiresToken(asset)))
  } catch (err) {
    anonymousError = err
  }

  const results = [...anonymous, ...(await fetchWithToken(assets.filter(requiresToken)))]
  if (results.length > 0) return results
  throw anonymousError ?? new Error('Brapi: estes tickers exigem token (configure BRAPI_API_KEY)')
}

async function fetchJson(url: string, withToken: boolean): Promise<BrapiResponse> {
  const headers: Record<string, string> =
    withToken && env.BRAPI_API_KEY ? { Authorization: `Bearer ${env.BRAPI_API_KEY}` } : {}

  let response: Response
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  } catch (err) {
    throw new Error(`Brapi: falha de rede para ${url}: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!response.ok) {
    throw new BrapiHttpError(response.status, url)
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

    const results = await fetchAvailable(assets)
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