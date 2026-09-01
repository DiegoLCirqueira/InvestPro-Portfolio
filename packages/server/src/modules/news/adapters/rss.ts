// @investpro/server
// Parser defensivo de RSS 2.0 / Atom usando fast-xml-parser.
// Nunca lança na estrutura: entradas inválidas são descartadas.

import { XMLParser } from 'fast-xml-parser'
import { NEWS_FETCH_TIMEOUT_MS } from '../sources.js'

export interface RawNewsItem {
  guid: string
  title: string
  description: string
  url: string
  publishedAt: string | null
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  trimValues: true,
})

function textOf(node: unknown): string | undefined {
  if (typeof node === 'string') return node === '' ? undefined : node
  if (typeof node === 'number') return String(node)
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    for (const candidate of ['#text', '#cdata', '#comment']) {
      const value = obj[candidate]
      if (typeof value === 'string' && value !== '') return value
    }
    const href = obj['@_href']
    if (typeof href === 'string') return href
  }
  return undefined
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

function extractChannelItems(doc: Record<string, unknown>): unknown[] {
  const rss = doc['rss']
  const channel = (rss as Record<string, unknown> | undefined)?.['channel']
  if (channel) {
    const items = (channel as Record<string, unknown>)['item']
    return asArray(items)
  }
  return []
}

function extractAtomEntries(doc: Record<string, unknown>): unknown[] {
  const feed = doc['feed']
  if (!feed) return []
  const entries = (feed as Record<string, unknown>)['entry']
  return asArray(entries)
}

function toRawTitle(item: Record<string, unknown>): string | undefined {
  return textOf(item['title'])
}

function toRawUrl(item: Record<string, unknown>): string | undefined {
  const link = item['link']
  const direct = textOf(link)
  if (direct) return direct
  const href = (link as Record<string, unknown> | undefined)?.['@_href']
  return typeof href === 'string' ? href : undefined
}

function toRawDescription(item: Record<string, unknown>): string {
  const description = textOf(item['description'])
  if (description) return description
  const encoded = item['content:encoded']
  return textOf(encoded) ?? textOf(item['summary']) ?? ''
}

function toRawDate(item: Record<string, unknown>): string | null {
  const pubDate = textOf(item['pubDate'])
  if (pubDate) return parseDate(pubDate)
  const dcDate = textOf(item['dc:date'])
  if (dcDate) return parseDate(dcDate)
  const updated = textOf(item['updated'])
  if (updated) return parseDate(updated)
  const published = textOf(item['published'])
  if (published) return parseDate(published)
  return null
}

function toRawGuid(item: Record<string, unknown>): string | undefined {
  return (
    textOf(item['guid']) ??
    (typeof item['guid'] === 'string' ? item['guid'] : undefined) ??
    toRawUrl(item)
  )
}

function entryToRaw(item: unknown): RawNewsItem | null {
  if (!item || typeof item !== 'object') return null

  const record = item as Record<string, unknown>
  const title = toRawTitle(record)?.trim()
  const url = toRawUrl(record)?.trim()

  if (!title || !url) return null

  return {
    guid: toRawGuid(record) ?? url,
    title,
    description: toRawDescription(record),
    url,
    publishedAt: toRawDate(record),
  }
}

export function parseFeed(xml: string): RawNewsItem[] {
  let doc: Record<string, unknown>
  try {
    const parsed = parser.parse(xml) as unknown
    if (!parsed || typeof parsed !== 'object') return []
    doc = parsed as Record<string, unknown>
  } catch {
    return []
  }

  const items = [...extractChannelItems(doc), ...extractAtomEntries(doc)]
  const seen = new Set<string>()
  const result: RawNewsItem[] = []

  for (const item of items) {
    const raw = entryToRaw(item)
    if (!raw) continue
    if (seen.has(raw.url)) continue
    seen.add(raw.url)
    result.push(raw)
  }

  return result
}

export async function fetchFeedXml(url: string): Promise<string> {
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(NEWS_FETCH_TIMEOUT_MS) })
  } catch (err) {
    throw new Error(`RSS: falha de rede em ${url}: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!response.ok) {
    throw new Error(`RSS: HTTP ${response.status} em ${url}`)
  }

  try {
    return await response.text()
  } catch (err) {
    throw new Error(`RSS: corpo inválido em ${url}: ${err instanceof Error ? err.message : String(err)}`)
  }
}