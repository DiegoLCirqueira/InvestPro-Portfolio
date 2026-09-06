// @investpro/server
// Service de notícias: busca nas fontes RSS, normaliza, categoriza, deduplica,
// cacheia em memória (TTL) e pagina. Falha de feed nunca derruba o endpoint.

import type {
  NewsItem,
  NewsList,
  NewsQuery,
} from '@investpro/shared'
import type { FastifyBaseLogger } from 'fastify'
import { fetchFeedXml, parseFeed, type RawNewsItem } from './adapters/rss.js'
import { NEWS_SOURCES, type NewsSource } from './sources.js'
import {
  applySourcePolicy,
  dedupeNews,
  normalizeInput,
  sortNewsByDate,
  toNewsId,
  type CategorizedNews,
} from './news.domain.js'

const NEWS_TTL_MS = 300_000
const NEWS_CACHE_KEY = 'news:items'
const NEWS_MAX_PER_SOURCE = 25

let logger: FastifyBaseLogger | undefined

export function configureLogger(log?: FastifyBaseLogger): void {
  logger = log
}

function logWarn(message: string, err?: unknown): void {
  if (err === undefined) {
    logger?.warn(message)
    return
  }
  logger?.warn({ err }, `${message}: ${err instanceof Error ? err.message : String(err)}`)
}

const cacheStore = new Map<string, { data: unknown; expiresAt: number }>()

function cacheGet<T>(key: string): T | undefined {
  const entry = cacheStore.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key)
    return undefined
  }
  return entry.data as T
}

function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  cacheStore.set(key, { data, expiresAt: Date.now() + ttlMs })
}

function toNewsItem(item: CategorizedNews): NewsItem {
  return {
    id: toNewsId(item.guid, item.url),
    title: item.title,
    summary: item.summary,
    source: item.source,
    category: item.category,
    url: item.url,
    publishedAt: item.publishedAt ?? new Date().toISOString(),
  }
}

async function fetchFromSource(source: NewsSource): Promise<NewsItem[]> {
  const xml = await fetchFeedXml(source.url)
  const rawItems: RawNewsItem[] = parseFeed(xml).slice(0, NEWS_MAX_PER_SOURCE)

  const relevant = rawItems
    .map((raw) => normalizeInput(raw, source.label))
    .map((item) => applySourcePolicy(item, source))
    .filter((item): item is CategorizedNews => item !== null)

  return relevant.map(toNewsItem)
}

async function fetchAllSources(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    NEWS_SOURCES.map((source) => fetchFromSource(source))
  )

  const collected: NewsItem[] = []
  results.forEach((result, index) => {
    const source = NEWS_SOURCES[index]
    if (result.status === 'fulfilled') {
      collected.push(...result.value)
    } else {
      logWarn(`Feed "${source.label}" falhou; seguindo com as demais fontes`, result.reason)
    }
  })

  const deduped = dedupeNews(
    collected.map((item) => ({
      guid: item.id,
      title: item.title,
      summary: item.summary,
      source: item.source,
      category: item.category,
      url: item.url,
      publishedAt: item.publishedAt,
    }))
  )

  return sortNewsByDate(deduped).map(toNewsItem)
}

export async function getNews(query: NewsQuery): Promise<NewsList> {
  let items = cacheGet<NewsItem[]>(NEWS_CACHE_KEY)
  if (!items) {
    try {
      items = await fetchAllSources()
    } catch (err) {
      logWarn('Falha geral ao buscar notícias', err)
      items = []
    }
    cacheSet(NEWS_CACHE_KEY, items, NEWS_TTL_MS)
  }

  const filtered = query.category
    ? items.filter((item) => item.category === query.category)
    : items

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