// @investpro/server
// Lógica pura de notícias: categorização por palavras-chave, normalização e dedup.
// Sem dependência de I/O — testável sem rede/banco.

import { NEWS_CATEGORIES } from '@investpro/shared'

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]

const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  CRYPTO: [
    'bitcoin', 'btc', 'ethereum', 'eth', 'cripto', 'crypto', 'blockchain',
    'token', 'defi', 'altcoin', 'solana', 'stablecoin', 'nft', 'ripple',
  ],
  COMPANIES: [
    'acoes', 'açoes', 'stock', 'stocks', 'empresa', 'company', 'lucro',
    'profit', 'earnings', 'balanço', 'balanco', 'guidance', 'b3', 'ipo',
    'aquisição', 'aquisicao', 'acquisition', 'magalu', 'petr4', 'vale3',
    'itau', 'itaú', 'ambev', 'dividendos', 'dividends',
  ],
  MACRO: [
    'inflação', 'inflacao', 'inflation', 'juros', 'copom', 'banco central',
    'central bank', 'selic', 'ipca', 'pib', 'tesouro', 'câmbio', 'cambio',
    'dólar', 'dolar', 'taxa basica', 'fed', 'economia americana',
  ],
  ECONOMY: [
    'economia', 'economy', 'emprego', 'desemprego', 'unemployment', 'fiscal',
    'orçamento', 'orcamento', 'impostos', 'tributos', 'reforma tributaria',
    'carga tributaria', 'gasto publico',
  ],
  WORLD: [
    'world', 'mundial', 'global', 'internacional', 'china', 'eua', 'estados unidos',
    'rússia', 'russia', 'ucrânia', 'ukraine', 'orient medio', 'oriente médio',
    'middle east', 'europa', 'europe', 'geopolitica', 'guerra', 'war', 'asia',
  ],
  MARKET: [
    'mercado', 'market', 'bolsa', 'ibovespa', 's&p', 'nasdaq', 'dow jones',
    'wall street', 'renda fixa', 'fundos', 'funds', 'etf', 'corretora',
    'investimento', 'invest', 'cotações', 'quotations', 'asset', 'gestão',
  ],
}

export const CATEGORY_ORDER: NewsCategory[] = [
  'CRYPTO',
  'COMPANIES',
  'MACRO',
  'ECONOMY',
  'WORLD',
  'MARKET',
]

export function categorizeNews(text: string, fallback: NewsCategory): NewsCategory {
  const haystack = ` ${text.trim().toLowerCase()} `
  for (const category of CATEGORY_ORDER) {
    const keywords = CATEGORY_KEYWORDS[category]
    for (const keyword of keywords) {
      if (haystack.includes(keyword)) return category
    }
  }
  return fallback
}

export function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function summarize(value: string, maxLength = 240): string {
  const cleaned = stripHtml(value)
  if (cleaned.length <= maxLength) return cleaned
  const truncated = cleaned.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim()}…`
}

export function hashText(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export interface NormalizedNews {
  guid: string
  title: string
  summary: string
  source: string
  category: NewsCategory
  url: string
  publishedAt: string | null
}

export function normalizeInput(
  item: { guid: string; title: string; description: string; url: string; publishedAt: string | null },
  sourceLabel: string,
  fallbackCategory: NewsCategory,
): NormalizedNews {
  const title = item.title.trim() || 'Sem título'
  const summary = summarize(item.description)
  return {
    guid: item.guid || item.url,
    title,
    summary,
    source: sourceLabel,
    category: categorizeNews(`${title} ${summary}`, fallbackCategory),
    url: item.url,
    publishedAt: item.publishedAt,
  }
}

export function dedupeNews(items: ReadonlyArray<NormalizedNews>): NormalizedNews[] {
  const seen = new Map<string, NormalizedNews>()
  for (const item of items) {
    const key = item.url.toLowerCase()
    if (!seen.has(key)) seen.set(key, item)
  }
  return [...seen.values()]
}

export function sortNewsByDate(items: ReadonlyArray<NormalizedNews>): NormalizedNews[] {
  return [...items].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0
    return tb - ta
  })
}

export function toNewsId(guid: string, url: string): string {
  return hashText(`${guid}|${url}`)
}