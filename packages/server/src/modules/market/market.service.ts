// @investpro/server
// Service do módulo de mercado: listagem, cotações e histórico com cache + fallback.

import type { FastifyBaseLogger } from 'fastify'
import type {
  Asset,
  AssetList,
  AssetQuery,
  Currency,
  PriceHistory,
  PriceSource,
  Quote,
} from '@investpro/shared'
import { CURRENCIES } from '@investpro/shared'
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
// A AwesomeAPI é a MESMA fonte que o câmbio (exchange.rates.ts) já consulta pro
// par USD-BRL: sem isso, o scheduler daqui e o câmbio faziam duas chamadas de
// rede independentes pro mesmo par, dobrando o consumo do limite de requisições
// da AwesomeAPI (incidente de 429 em produção). Ver currencyPairOf/fetchCurrencyPairQuote.
import { liveRates } from '../exchange/exchange.rates.js'
import { env } from '../../config/env.js'

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

// Alguns ativos "awesomeapi" (hoje só o proxy de renda fixa SELIC) na verdade são
// um PAR DE MOEDAS (remoteId 'USD-BRL') usado como referência externa — o mesmo
// dado que o câmbio consulta. Detecta esse formato pra rotear a busca pelo
// provider único do câmbio em vez de chamar a AwesomeAPI de novo por conta própria.
function currencyPairOf(remoteId: string | undefined): { from: Currency; to: Currency } | undefined {
  const isCurrency = (code: string | undefined): code is Currency =>
    (CURRENCIES as readonly string[]).includes(code ?? '')
  const [from, to] = (remoteId ?? '').split('-')
  return isCurrency(from) && isCurrency(to) ? { from, to } : undefined
}

// Cotação de um ativo-proxy de par de moedas, vinda do MESMO cache/provider que o
// câmbio usa (liveRates): reaproveita o freshTtl, o maxAge, o backoff de 429 e a
// rejeição por desvio já testados lá, em vez de duplicá-los aqui. É o que garante
// no máximo uma chamada de rede por par por ciclo, não importa se quem pediu
// primeiro foi o scheduler (refreshQuotes) ou o câmbio (getRate/convert/execute).
async function fetchCurrencyPairQuote(
  seed: SeedAsset,
  pair: { from: Currency; to: Currency }
): Promise<MarketQuote> {
  const price = await liveRates.getRate(pair.from, pair.to)
  return { ticker: seed.ticker, name: seed.name, type: seed.type, price, change24h: 0, changePercent: 0 }
}

// Preço estático de referência, marcado como seed pra o cliente poder avisar que
// não é cotação viva.
function seedAsQuote(seed: SeedAsset): MarketQuote {
  return {
    ticker: seed.ticker,
    name: seed.name,
    type: seed.type,
    price: seed.price,
    change24h: seed.change24h,
    changePercent: seed.changePercent,
    priceSource: 'seed',
  }
}

const priceSourceOf = (quote: MarketQuote): PriceSource => quote.priceSource ?? 'live'

function toAsset(seed: SeedAsset): Asset {
  const quote = cacheGet<MarketQuote>(quoteCacheKey(seed.ticker)) ?? seedAsQuote(seed)
  return {
    id: seed.id,
    ticker: seed.ticker,
    name: quote.name,
    type: seed.type,
    price: quote.price,
    change24h: quote.change24h,
    changePercent: quote.changePercent,
    priceSource: priceSourceOf(quote),
  }
}

function toQuote(quote: MarketQuote): Quote {
  return {
    ticker: quote.ticker,
    price: quote.price,
    change: quote.change24h,
    changePercent: quote.changePercent,
    priceSource: priceSourceOf(quote),
  }
}

function buildAssetList(): Asset[] {
  return baseAssets.map(toAsset)
}

export async function getAssets(query: AssetQuery): Promise<AssetList> {
  // Sem o scheduler (serverless), a lista busca as cotações quando venceram.
  if (env.SERVERLESS) await refreshQuotesIfStale()

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

// Busca de um ticker sem cache; o resultado (ou o fallback) vai pro cache.
async function fetchQuote(seed: SeedAsset): Promise<MarketQuote> {
  const cacheKey = quoteCacheKey(seed.ticker)
  const adapter = ADAPTERS[seed.source]
  if (adapter) {
    try {
      const quote = (await adapter.fetchQuotes([seed]))[0]
      if (quote) {
        cacheSet(cacheKey, quote, QUOTE_TTL_MS)
        return quote
      }
    } catch (err) {
      logError(`Fonte ${seed.source} indisponível para ${seed.ticker}; usando fallback`, err)
    }
  } else {
    logError(`Sem adapter para a fonte ${seed.source} de ${seed.ticker}; usando fallback`)
  }

  const fallback = seedAsQuote(seed)
  cacheSet(cacheKey, fallback, QUOTE_TTL_MS)
  return fallback
}

// Pedidos simultâneos do mesmo ticker com cache vencido esperam a mesma busca,
// em vez de cada um gastar uma chamada (e o limite) da fonte.
const quotesInFlight = new Map<string, Promise<MarketQuote>>()

export async function getQuote(ticker: string): Promise<Quote> {
  const normalized = ticker.toUpperCase()

  const cached = cacheGet<MarketQuote>(quoteCacheKey(normalized))
  if (cached) return toQuote(cached)

  const seed = findAsset(normalized)
  if (!seed) {
    throw new AppError('ASSET_NOT_FOUND', `Ativo ${ticker} não encontrado`, 404)
  }

  let pending = quotesInFlight.get(normalized)
  if (!pending) {
    pending = fetchQuote(seed).finally(() => quotesInFlight.delete(normalized))
    quotesInFlight.set(normalized, pending)
  }
  return toQuote(await pending)
}

export interface AssetMeta {
  name: string
  type: string
}

export async function getAssetMeta(ticker: string): Promise<AssetMeta | null> {
  const seed = findAsset(ticker)
  if (!seed) return null
  return { name: seed.name, type: seed.type }
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

// Busca em lote pelo adapter genérico da fonte (Brapi/CoinGecko/AwesomeAPI) —
// o caminho de sempre, usado por qualquer ativo que não seja um par de moedas.
async function refreshByAdapter(source: string, assets: SeedAsset[]): Promise<void> {
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
}

// Grupo "awesomeapi": separa os ativos que são par de moedas (roteados pro
// provider único do câmbio, ver fetchCurrencyPairQuote) dos demais (se algum dia
// existir um ativo "awesomeapi" que não seja par de moedas, segue pelo adapter
// direto, como sempre). Cada ativo-par busca/falha por conta própria — um par
// indisponível não deve derrubar os outros.
async function refreshAwesomeApiGroup(assets: SeedAsset[]): Promise<void> {
  const pairAssets: Array<{ seed: SeedAsset; pair: { from: Currency; to: Currency } }> = []
  const otherAssets: SeedAsset[] = []

  for (const seed of assets) {
    const pair = currencyPairOf(seed.remoteId)
    if (pair) pairAssets.push({ seed, pair })
    else otherAssets.push(seed)
  }

  const refreshed = await Promise.all(
    pairAssets.map(async ({ seed, pair }) => {
      try {
        cacheSet(quoteCacheKey(seed.ticker), await fetchCurrencyPairQuote(seed, pair), QUOTE_TTL_MS)
        return true
      } catch (err) {
        logError(`Cotação de câmbio indisponível pra ${seed.ticker} (par ${pair.from}-${pair.to}); mantendo cache/fallback`, err)
        return false
      }
    })
  )
  if (refreshed.some(Boolean)) cacheDelete(ASSETS_CACHE_KEY)

  if (otherAssets.length > 0) await refreshByAdapter('awesomeapi', otherAssets)
}

async function fetchAllQuotes(): Promise<void> {
  const bySource: Record<string, SeedAsset[]> = {}

  for (const seed of baseAssets) {
    if (ADAPTERS[seed.source]) {
      const group = bySource[seed.source]
      if (group) group.push(seed)
      else bySource[seed.source] = [seed]
    }
  }

  await Promise.all(
    Object.entries(bySource).map(([source, assets]) =>
      source === 'awesomeapi' ? refreshAwesomeApiGroup(assets) : refreshByAdapter(source, assets)
    )
  )
}
let refreshInFlight: Promise<void> | undefined
let lastRefreshStartedAt = 0

// O scheduler e as requisições (serverless) compartilham a busca em andamento:
// nunca duas buscas do catálogo inteiro ao mesmo tempo.
export function refreshQuotes(): Promise<void> {
  if (!refreshInFlight) {
    lastRefreshStartedAt = Date.now()
    refreshInFlight = fetchAllQuotes().finally(() => {
      refreshInFlight = undefined
    })
  }
  return refreshInFlight
}

// Conta a partir do INÍCIO da última busca: assim a próxima sai antes de as
// cotações da anterior (TTL contado do fim) expirarem e virarem "estimadas".
// Quem chega com uma busca já em andamento espera por ela (senão leria o
// catálogo ainda sem cotação).
export function refreshQuotesIfStale(): Promise<void> {
  if (refreshInFlight || Date.now() - lastRefreshStartedAt >= QUOTE_TTL_MS) return refreshQuotes()
  return Promise.resolve()
}
