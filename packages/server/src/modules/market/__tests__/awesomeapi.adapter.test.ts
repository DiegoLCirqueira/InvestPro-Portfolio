// @investpro/server
// Testes do adapter AwesomeAPI com fetch stubado (offline). A cotação alimenta
// câmbio executado com dinheiro real: bid inválido (NaN, zero, negativo,
// infinito) tem que ser descartado, nunca virar preço.

import { afterEach, describe, expect, it, vi } from 'vitest'

// Mutável: os testes de autenticação alternam AWESOMEAPI_TOKEN por caso, e os
// demais testes do arquivo seguem com o padrão '' (nível anônimo), igual ao
// comportamento real quando a env não está definida.
const mockEnv = vi.hoisted(() => ({ AWESOMEAPI_TOKEN: '' }))
vi.mock('../../../config/env.js', () => ({ env: mockEnv }))

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

// Params tipados (mesmo sem uso) pra o mock capturar url/headers da chamada real
// com o tipo certo, em vez de `any` — usado pelos testes de autenticação abaixo.
function stubAwesomeApiBid(bid: unknown) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
    new Response(JSON.stringify({ USDBRL: { bid, pctChange: '0.5' } }))
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
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

describe('awesomeapiSource.fetchQuotes — autenticação (AWESOMEAPI_TOKEN)', () => {
  afterEach(() => {
    mockEnv.AWESOMEAPI_TOKEN = ''
  })

  it('sem AWESOMEAPI_TOKEN: chamada sem header x-api-key (nível anônimo, comportamento de hoje)', async () => {
    const fetchMock = stubAwesomeApiBid('5.2345')

    await awesomeapiSource.fetchQuotes([usdBrl])

    const [, init] = fetchMock.mock.calls[0]
    expect(init?.headers).not.toHaveProperty('x-api-key')
  })

  it('com AWESOMEAPI_TOKEN: envia o token no header x-api-key, nunca na query string', async () => {
    mockEnv.AWESOMEAPI_TOKEN = 'token-de-teste'
    const fetchMock = stubAwesomeApiBid('5.2345')

    await awesomeapiSource.fetchQuotes([usdBrl])

    const [url, init] = fetchMock.mock.calls[0]
    expect(init?.headers).toEqual({ 'x-api-key': 'token-de-teste' })
    expect(url).not.toContain('token-de-teste')
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
