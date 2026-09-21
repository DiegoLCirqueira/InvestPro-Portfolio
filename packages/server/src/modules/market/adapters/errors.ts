// @investpro/server
// Erros tipados das fontes de dados de mercado.

/** A fonte respondeu 429: pedir de novo antes de `retryAfterMs` só agrava o bloqueio. */
export class UpstreamRateLimitedError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs: number
  ) {
    super(message)
    this.name = 'UpstreamRateLimitedError'
  }
}

// Sem Retry-After (ou ilegível), espera prudente; e nunca mais que o teto, pra
// um header absurdo não travar a fonte pra sempre.
const DEFAULT_RETRY_AFTER_MS = 30_000
const MAX_RETRY_AFTER_MS = 5 * 60_000

// Retry-After vem em segundos inteiros ou como data HTTP.
export function parseRetryAfterMs(header: string | null, now: number = Date.now()): number {
  const value = header?.trim()
  if (!value) return DEFAULT_RETRY_AFTER_MS

  const asSeconds = /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - now
  if (!Number.isFinite(asSeconds) || asSeconds < 0) return DEFAULT_RETRY_AFTER_MS
  return Math.min(asSeconds, MAX_RETRY_AFTER_MS)
}
