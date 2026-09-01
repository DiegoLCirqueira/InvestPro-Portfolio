// @investpro/server
// Cache em memória com TTL para o módulo de mercado.

export const QUOTE_TTL_MS = 60_000
export const ASSETS_TTL_MS = 300_000

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const store = new Map<string, CacheEntry>()

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return undefined
  }
  return entry.data as T
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function cacheDelete(key: string): void {
  store.delete(key)
}

export function cacheClear(): void {
  store.clear()
}

export function quoteCacheKey(ticker: string): string {
  return `quote:${ticker.toUpperCase()}`
}