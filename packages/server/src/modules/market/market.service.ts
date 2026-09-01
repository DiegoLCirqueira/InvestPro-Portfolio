// @investpro/server
// Service do módulo de mercado: listagem, cotações e histórico com cache + fallback.

import type { FastifyBaseLogger } from 'fastify'
import type {
  Asset,
  AssetList,
  AssetQuery,
  PriceHistory,
  Quote,
} from '@investpro/shared'
import { AppError } from '../auth/auth.service.js'
import { brapiSource } from './adapters/brapi.js'
import { coingeckoSource } from './adapters/coingecko.js'
import { awesomeapiSource } from './adapters/awesomeapi.js'
import type { MarketDataSource, MarketQuote, SeedAsset } from './adapters/types.js'
import { baseAssets } from './assets.js'
import {
  ASSETS_TTL_MS,
  cacheDelete,
  cacheGet,
  cacheSet,
  QUOTE_TTL_MS,
  quoteCacheKey,
} from './cache.js'

const ADAPTERS: Record<string, MarketDataSource> = {
  brapi: brapiSource,
  coingecko: coingeckoSource,
  awesomeapi: awesomeapiSource,
}

const ASSETS_CACHE_KEY = 'market:assets'

let logger: FastifyBaseLogger | undefined

export function configureLogger(log?: FastifyBaseLogger): void {
  logger = log
}

function logError(message: string, err?: unknown): void {
  if (err === undefined) {
    logger?.warn(message)
    return
  }
  logger?.error({ err }, `${message}: ${err instanceof Error ? err.message : String(err)}`)
}

function findAsset(ticker: string): SeedAsset | undefined {
  return baseAssets.find((a) => a.ticker === ticker.toUpperCase())
}

function toAsset(seed: SeedAsset): Asset {
  const quote = cacheGet<MarketQuote>(quoteCacheKey(seed.ticker))
  if (quote) {
    return {
      id: seed.id,
      ticker: seed.ticker,
      name: quote.name,
      type: seed.type,
      price: quote.price,
      change24h: quote.change24h,
      changePercent: quote.changePercent,
    }
  }
  return {
    id: seed.id,
    ticker: seed.ticker,
    name: seed.name,
    type: seed.type,
    price: seed.price,
    change24h: seed.change24h,
    changePercent: seed.changePercent,
  }
}

function toQuote(quote: MarketQuote): Quote {
  return {
    ticker: quote.ticker,
    price: quote.price,
    change: quote.change24h,
    changePercent: quote.changePercent,
  }
}

function buildAssetList(): Asset[] {
  return baseAssets.map(toAsset)
}

export async function getAssets(query: AssetQuery): Promise<AssetList> {
  let items = cacheGet<Asset[]>(ASSETS_CACHE_KEY)
  if (!items) {
    items = buildAssetList()
    cacheSet(ASSETS_CACHE_KEY, items, ASSETS_TTL_MS)
  }

  const filtered = items.filter((asset) => {
    if (query.type && asset.type !== query.type) return false
    if (query.search) {
      const search = query.search.trim().toLowerCase()
      if (
        search &&
        !asset.ticker.toLowerCase().includes(search) &&
        !asset.name.toLowerCase().includes(search)
      ) {
        return false
      }
    }
    return true
  })

  const page = query.page
  const limit = query.limit
  const start = (page - 1) * limit

  return {
    items: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
  }
}

export async function getQuote(ticker: string): Promise<Quote> {
  const normalized = ticker.toUpperCase()
  const cacheKey = quoteCacheKey(normalized)

  const cached = cacheGet<MarketQuote>(cacheKey)
  if (cached) return toQuote(cached)

  const seed = findAsset(normalized)
  if (!seed) {
    throw new AppError('ASSET_NOT_FOUND', `Ativo ${ticker} não encontrado`, 404)
  }

  const adapter = ADAPTERS[seed.source]
  if (adapter) {
    try {
      const quotes = await adapter.fetchQuotes([seed])
      const quote = quotes[0]
      if (quote) {
        cacheSet(cacheKey, quote, QUOTE_TTL_MS)
        return toQuote(quote)
      }
    } catch (err) {
      logError(`Fonte ${seed.source} indisponível para ${normalized}; usando fallback`, err)
    }
  } else {
    logError(`Sem adapter para a fonte ${seed.source} de ${normalized}; usando fallback`)
  }

  const fallback: MarketQuote = {
    ticker: seed.ticker,
    name: seed.name,
    type: seed.type,
    price: seed.price,
    change24h: seed.change24h,
    changePercent: seed.changePercent,
  }
  cacheSet(cacheKey, fallback, QUOTE_TTL_MS)
  return toQuote(fallback)
}

export interface HistoryQueryParams {
  interval: '1d' | '1w' | '1m'
  limit: number
}

const INTERVAL_DAYS: Record<string, number> = {
  '1d': 1,
  '1w': 7,
  '1m': 30,
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash
}

export async function getHistory(
  ticker: string,
  query: HistoryQueryParams
): Promise<PriceHistory> {
  const normalized = ticker.toUpperCase()
  if (!findAsset(normalized)) {
    throw new AppError('ASSET_NOT_FOUND', `Ativo ${ticker} não encontrado`, 404)
  }

  const quote = await getQuote(normalized)
  const steps = query.limit > 0 ? query.limit : 30
  const stepMs = (INTERVAL_DAYS[query.interval] ?? 1) * 86_400_000
  const phase = (Math.abs(hashString(normalized)) % 1000) + 1

  const now = Date.now()
  const points: Array<{ timestamp: string; price: number }> = []
  for (let i = steps - 1; i >= 0; i--) {
    const timestamp = new Date(now - i * stepMs).toISOString()
    const wave = Math.sin((i + phase) * 0.7) * quote.price * 0.01
    const drift = ((steps - i) / steps) * quote.price * 0.03
    const price = Math.round((quote.price - drift + wave) * 100) / 100
    points.push({ timestamp, price })
  }

  return { ticker: quote.ticker, points }
}

export async function refreshQuotes(): Promise<void> {
  const bySource: Record<string, SeedAsset[]> = {}

  for (const seed of baseAssets) {
    if (ADAPTERS[seed.source]) {
      const group = bySource[seed.source]
      if (group) group.push(seed)
      else bySource[seed.source] = [seed]
    }
  }

  await Promise.all(
    Object.entries(bySource).map(async ([source, assets]) => {
      const adapter = ADAPTERS[source]
      try {
        const quotes = await adapter.fetchQuotes(assets)
        for (const quote of quotes) {
          cacheSet(quoteCacheKey(quote.ticker), quote, QUOTE_TTL_MS)
        }
        cacheDelete(ASSETS_CACHE_KEY)
      } catch (err) {
        logError(`Refresh de ${source} falhou; mantendo cache/fallback`, err)
      }
    })
  )
}