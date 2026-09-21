// @investpro/server
// Testes do adapter AwesomeAPI com fetch stubado (offline). A cotação alimenta
// câmbio executado com dinheiro real: bid inválido (NaN, zero, negativo,
// infinito) tem que ser descartado, nunca virar preço.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { awesomeapiSource } from '../adapters/awesomeapi.js'
import { parseRetryAfterMs, UpstreamRateLimitedError } from '../adapters/errors.js'
import type { SourceAsset } from '../adapters/types.js'

const usdBrl: SourceAsset = {
  id: 'USD-BRL',
  ticker: 'USD-BRL',
  name: 'USD-BRL',
  type: 'FIXED_INCOME',
  remoteId: 'USD-BRL',
}

function stubAwesomeApiBid(bid: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ USDBRL: { bid, pctChange: '0.5' } })))
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('awesomeapiSource.fetchQuotes', () => {
  it('converte bid válido em preço numérico', async () => {
    stubAwesomeApiBid('5.2345')
    const [quote] = await awesomeapiSource.fetchQuotes([usdBrl])
    expect(quote?.price).toBe(5.2345)
  })

  it.each(['NaN', 'abc', '0', '-1', 'Infinity', '-Infinity', ''])(
    'descarta bid inválido (%j) em vez de devolver como preço',
    async (bid) => {
      stubAwesomeApiBid(bid)
      await expect(awesomeapiSource.fetchQuotes([usdBrl])).rejects.toThrow(
        'AwesomeAPI: nenhuma cotação retornada'
      )
    }
  )
})

describe('awesomeapiSource.fetchQuotes — HTTP 429', () => {
  function stubRateLimited(retryAfter?: string): void {
    const headers = retryAfter === undefined ? {} : { 'retry-after': retryAfter }
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429, headers })))
  }

  it('lança UpstreamRateLimitedError com o Retry-After (segundos) convertido pra ms', async () => {
    stubRateLimited('45')
    const error = await awesomeapiSource.fetchQuotes([usdBrl]).catch((err) => err)
    expect(error).toBeInstanceOf(UpstreamRateLimitedError)
    expect(error.retryAfterMs).toBe(45_000)
  })

  it('sem Retry-After usa a espera padrão de 30 s', async () => {
    stubRateLimited()
    const error = await awesomeapiSource.fetchQuotes([usdBrl]).catch((err) => err)
    expect(error.retryAfterMs).toBe(30_000)
  })
})

describe('parseRetryAfterMs', () => {
  const now = Date.parse('2026-09-20T12:00:00Z')

  it('aceita segundos inteiros e data HTTP', () => {
    expect(parseRetryAfterMs('10', now)).toBe(10_000)
    expect(parseRetryAfterMs('Sun, 20 Sep 2026 12:00:20 GMT', now)).toBe(20_000)
  })

  it('limita a 5 min e cai no padrão (30 s) com valor ausente, inválido ou no passado', () => {
    expect(parseRetryAfterMs('999999', now)).toBe(300_000)
    expect(parseRetryAfterMs(null, now)).toBe(30_000)
    expect(parseRetryAfterMs('depois', now)).toBe(30_000)
    expect(parseRetryAfterMs('Sun, 20 Sep 2026 11:00:00 GMT', now)).toBe(30_000)
  })
})
