// @investpro/server
// Cotação viva do câmbio (AwesomeAPI) com cache curto, sem credencial nova e sem
// trocar de provedor. A AwesomeAPI devolve 429 em produção, e o câmbio executado
// não pode cair no fallback estático (taxa inventada), então:
// - cotação fresca (idade <= freshTtl) é reaproveitada sem chamar a API;
// - em falha ou 429, serve a última cotação só se a idade <= maxAge; além disso,
//   503 (nunca uma taxa estática);
// - cotação nova que desvia demais da última boa é rejeitada (resposta corrompida
//   ou manipulada não vira taxa de câmbio) e tratada como falha da fonte;
// - chamadas concorrentes ao mesmo par compartilham uma única requisição;
// - 429 abre um backoff (Retry-After) em que a API não é chamada: quem chama
//   durante ele só é servido do cache, então tráfego anônimo não prolonga o 429.

import type { FastifyBaseLogger } from 'fastify'
import type { Currency } from '@investpro/shared'
import { env } from '../../config/env.js'
import { AppError } from '../auth/auth.service.js'
import { awesomeapiSource } from '../market/adapters/awesomeapi.js'
import { UpstreamRateLimitedError } from '../market/adapters/errors.js'

const isUsableRate = (rate: number | undefined): rate is number =>
  rate !== undefined && Number.isFinite(rate) && rate > 0

// Taxa de from→to na AwesomeAPI (par `${from}-${to}`, formato exigido pela URL).
// Se o par direto não existir, tenta o inverso e inverte. 429 sobe direto: tentar
// o par inverso só agravaria o bloqueio.
export async function fetchRateFromSource(from: Currency, to: Currency): Promise<number> {
  const pairs = [`${from}-${to}`, `${to}-${from}`]
  let lastError: unknown

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]
    const asset = { id: pair, ticker: pair, name: pair, type: 'FIXED_INCOME' as const, remoteId: pair }
    try {
      const quotes = await awesomeapiSource.fetchQuotes([asset])
      const price = quotes[0]?.price
      if (!isUsableRate(price)) continue

      // No par direto `${from}${to}` o preço já é from→to; no inverso inverte.
      const rate = i === 0 ? price : 1 / price
      if (isUsableRate(rate)) return rate
    } catch (err) {
      if (err instanceof UpstreamRateLimitedError) throw err
      lastError = err
    }
  }

  throw lastError ?? new Error('AwesomeAPI: par indisponível')
}

interface CachedRate {
  rate: number
  fetchedAt: number
}

export type ServedFromCacheReason = 'source_error' | 'rate_limited' | 'backoff' | 'rejected_quote'

export interface ServedFromCache {
  pair: string
  ageMs: number
  reason: ServedFromCacheReason
  error?: string
}

export interface RejectedQuote {
  pair: string
  rate: number
  lastGoodRate?: number
  deviationPercent?: number
}

export interface GetRateOptions {
  // Idade máxima aceita nesta chamada (o execute usa uma mais curta que a da simulação).
  maxAgeMs?: number
}

export interface LiveRateProviderOptions {
  fetchRate: (from: Currency, to: Currency) => Promise<number>
  freshTtlMs: number
  maxAgeMs: number
  maxDeviationPercent: number
  now?: () => number
  onServedFromCache?: (event: ServedFromCache) => void
  onQuoteRejected?: (event: RejectedQuote) => void
}

export interface LiveRateProvider {
  getRate: (from: Currency, to: Currency, options?: GetRateOptions) => Promise<number>
  reset: () => void
}

function unavailableError(): AppError {
  return new AppError(
    'EXCHANGE_RATE_UNAVAILABLE',
    'Cotação indisponível no momento; tente novamente em instantes',
    503
  )
}

// Cotação recebida mas descartada (inválida ou fora da faixa de sanidade): falha
// da fonte, não taxa.
class RejectedQuoteError extends Error {}

export function createLiveRateProvider(options: LiveRateProviderOptions): LiveRateProvider {
  const { fetchRate, freshTtlMs, maxAgeMs, maxDeviationPercent, onServedFromCache, onQuoteRejected } = options
  const now = options.now ?? (() => Date.now())

  const cache = new Map<string, CachedRate>()
  const inFlight = new Map<string, Promise<number>>()
  // A 429 vale pra API inteira (não por par): nenhum par é buscado durante o backoff.
  let backoffUntil = 0

  const ageOf = (entry: CachedRate): number => now() - entry.fetchedAt

  function serveCachedOrFail(
    pair: string,
    entry: CachedRate | undefined,
    limitMs: number,
    reason: ServedFromCacheReason,
    error?: unknown
  ): number {
    if (!entry || ageOf(entry) > limitMs) throw unavailableError()

    onServedFromCache?.({
      pair,
      ageMs: ageOf(entry),
      reason,
      ...(error instanceof Error && { error: error.message }),
    })
    return entry.rate
  }

  // A "última boa" só ancora a sanidade enquanto é recente (<= maxAge): uma cotação
  // velha demais não serve de referência, senão um movimento real de mercado
  // depois de um longo intervalo seria rejeitado pra sempre.
  function assertPlausible(pair: string, rate: number, lastGood: CachedRate | undefined): void {
    if (!isUsableRate(rate)) {
      onQuoteRejected?.({ pair, rate })
      throw new RejectedQuoteError('cotação inválida da fonte')
    }
    if (!lastGood || ageOf(lastGood) > maxAgeMs) return

    const deviationPercent = (Math.abs(rate - lastGood.rate) / lastGood.rate) * 100
    if (deviationPercent <= maxDeviationPercent) return

    onQuoteRejected?.({ pair, rate, lastGoodRate: lastGood.rate, deviationPercent })
    throw new RejectedQuoteError(`cotação desviou ${deviationPercent.toFixed(1)}% da última boa`)
  }

  async function fetchAndCache(
    from: Currency,
    to: Currency,
    pair: string,
    lastGood: CachedRate | undefined
  ): Promise<number> {
    try {
      const rate = await fetchRate(from, to)
      assertPlausible(pair, rate, lastGood)
      cache.set(pair, { rate, fetchedAt: now() })
      return rate
    } catch (err) {
      if (err instanceof UpstreamRateLimitedError) backoffUntil = now() + err.retryAfterMs
      throw err
    }
  }

  // Só a requisição é compartilhada; cada chamador decide sozinho, com o SEU limite
  // de idade, se serve do cache quando ela falha.
  function fetchOnce(from: Currency, to: Currency, pair: string, lastGood: CachedRate | undefined): Promise<number> {
    const pending = inFlight.get(pair)
    if (pending) return pending

    const started = fetchAndCache(from, to, pair, lastGood).finally(() => inFlight.delete(pair))
    inFlight.set(pair, started)
    return started
  }

  function failureReasonOf(err: unknown): ServedFromCacheReason {
    if (err instanceof RejectedQuoteError) return 'rejected_quote'
    return err instanceof UpstreamRateLimitedError ? 'rate_limited' : 'source_error'
  }

  async function getRate(from: Currency, to: Currency, callOptions: GetRateOptions = {}): Promise<number> {
    const pair = `${from}-${to}`
    const entry = cache.get(pair)
    const limitMs = callOptions.maxAgeMs ?? maxAgeMs

    // Nunca devolve como "fresca" uma cotação mais velha que o limite desta chamada.
    if (entry && ageOf(entry) <= Math.min(freshTtlMs, limitMs)) return entry.rate
    if (now() < backoffUntil) return serveCachedOrFail(pair, entry, limitMs, 'backoff')

    try {
      return await fetchOnce(from, to, pair, entry)
    } catch (err) {
      return serveCachedOrFail(pair, entry, limitMs, failureReasonOf(err), err)
    }
  }

  function reset(): void {
    cache.clear()
    inFlight.clear()
    backoffUntil = 0
  }

  return { getRate, reset }
}

let logger: FastifyBaseLogger | undefined

export function configureLogger(log?: FastifyBaseLogger): void {
  logger = log
}

export const liveRates = createLiveRateProvider({
  fetchRate: fetchRateFromSource,
  freshTtlMs: env.EXCHANGE_RATE_FRESH_TTL_SECONDS * 1000,
  maxAgeMs: env.EXCHANGE_RATE_MAX_AGE_SECONDS * 1000,
  maxDeviationPercent: env.EXCHANGE_RATE_MAX_DEVIATION_PERCENT,
  onServedFromCache: (event) =>
    logger?.warn(event, 'Cotação de câmbio servida do cache após falha da fonte'),
  onQuoteRejected: (event) =>
    logger?.warn(event, 'Cotação de câmbio rejeitada (inválida ou fora da faixa de sanidade)'),
})
