// @investpro/server
// Testes do provedor de cotação viva (cache curto + idade máxima + single-flight
// + backoff de 429). Timers falsos controlam a idade da cotação; a fonte é uma
// função mockada — nada de rede.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UpstreamRateLimitedError } from '../../market/adapters/errors.js'
import {
  createLiveRateProvider,
  type RejectedQuote,
  type ServedFromCache,
} from '../exchange.rates.js'

const FRESH_TTL_MS = 30_000
const MAX_AGE_MS = 120_000
const EXECUTE_MAX_AGE_MS = 60_000
const MAX_DEVIATION_PERCENT = 15

const fetchRateMock = vi.fn<(from: string, to: string) => Promise<number>>()
const servedFromCache: ServedFromCache[] = []
const rejectedQuotes: RejectedQuote[] = []

function newProvider() {
  return createLiveRateProvider({
    fetchRate: fetchRateMock,
    freshTtlMs: FRESH_TTL_MS,
    maxAgeMs: MAX_AGE_MS,
    maxDeviationPercent: MAX_DEVIATION_PERCENT,
    onServedFromCache: (event) => servedFromCache.push(event),
    onQuoteRejected: (event) => rejectedQuotes.push(event),
  })
}

function advanceSeconds(seconds: number): void {
  vi.advanceTimersByTime(seconds * 1000)
}

const unavailable = { code: 'EXCHANGE_RATE_UNAVAILABLE', statusCode: 503 }

beforeEach(() => {
  vi.useFakeTimers()
  fetchRateMock.mockReset()
  servedFromCache.length = 0
  rejectedQuotes.length = 0
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cache fresco', () => {
  it('reaproveita a cotação dentro do TTL fresco sem chamar a fonte de novo', async () => {
    fetchRateMock.mockResolvedValue(5)
    const provider = newProvider()

    expect(await provider.getRate('USD', 'BRL')).toBe(5)
    advanceSeconds(29)
    expect(await provider.getRate('USD', 'BRL')).toBe(5)

    expect(fetchRateMock).toHaveBeenCalledTimes(1)
  })

  it('depois do TTL fresco busca de novo e usa a cotação nova', async () => {
    fetchRateMock.mockResolvedValueOnce(5).mockResolvedValueOnce(5.2)
    const provider = newProvider()

    await provider.getRate('USD', 'BRL')
    advanceSeconds(31)

    expect(await provider.getRate('USD', 'BRL')).toBe(5.2)
    expect(fetchRateMock).toHaveBeenCalledTimes(2)
  })

  it('pares diferentes têm caches independentes', async () => {
    fetchRateMock.mockResolvedValueOnce(5).mockResolvedValueOnce(6)
    const provider = newProvider()

    expect(await provider.getRate('USD', 'BRL')).toBe(5)
    expect(await provider.getRate('EUR', 'BRL')).toBe(6)
  })
})

describe('falha da fonte', () => {
  it('dentro da idade máxima serve a cotação em cache e registra o motivo', async () => {
    fetchRateMock.mockResolvedValueOnce(5).mockRejectedValueOnce(new Error('fonte fora do ar'))
    const provider = newProvider()

    await provider.getRate('USD', 'BRL')
    advanceSeconds(100) // vencida (> 30 s), mas dentro dos 120 s

    expect(await provider.getRate('USD', 'BRL')).toBe(5)
    expect(servedFromCache).toEqual([
      { pair: 'USD-BRL', ageMs: 100_000, reason: 'source_error', error: 'fonte fora do ar' },
    ])
  })

  it('além da idade máxima responde 503 EXCHANGE_RATE_UNAVAILABLE (nunca taxa estática)', async () => {
    fetchRateMock.mockResolvedValueOnce(5).mockRejectedValueOnce(new Error('fonte fora do ar'))
    const provider = newProvider()

    await provider.getRate('USD', 'BRL')
    advanceSeconds(121)

    await expect(provider.getRate('USD', 'BRL')).rejects.toMatchObject(unavailable)
    expect(servedFromCache).toEqual([])
  })

  it('sem nada em cache responde 503', async () => {
    fetchRateMock.mockRejectedValue(new Error('fonte fora do ar'))

    await expect(newProvider().getRate('USD', 'BRL')).rejects.toMatchObject(unavailable)
  })

  it('a falha não fica presa: a próxima chamada tenta a fonte de novo', async () => {
    fetchRateMock.mockRejectedValueOnce(new Error('fora')).mockResolvedValueOnce(5)
    const provider = newProvider()

    await expect(provider.getRate('USD', 'BRL')).rejects.toMatchObject(unavailable)
    expect(await provider.getRate('USD', 'BRL')).toBe(5)
  })
})

describe('429 da fonte (Retry-After)', () => {
  // Cotação em t = 0; o 429 chega em t = 40 s (cotação já vencida, idade 40 s).
  async function providerRateLimitedAt40s(retryAfterMs: number) {
    fetchRateMock
      .mockResolvedValueOnce(5)
      .mockRejectedValueOnce(new UpstreamRateLimitedError('429', retryAfterMs))
    const provider = newProvider()
    await provider.getRate('USD', 'BRL')
    advanceSeconds(40)
    return provider
  }

  it('no 429 serve do cache (idade 40 s <= 120 s) e loga como rate_limited', async () => {
    const provider = await providerRateLimitedAt40s(60_000)

    expect(await provider.getRate('USD', 'BRL')).toBe(5)
    expect(servedFromCache).toEqual([
      expect.objectContaining({ reason: 'rate_limited', ageMs: 40_000 }),
    ])
  })

  it('durante o backoff NÃO chama a fonte: serve do cache dentro da idade máxima', async () => {
    const provider = await providerRateLimitedAt40s(60_000) // backoff até t = 100 s
    await provider.getRate('USD', 'BRL')
    fetchRateMock.mockClear()

    advanceSeconds(30) // t = 70 s
    expect(await provider.getRate('USD', 'BRL')).toBe(5)

    expect(fetchRateMock).not.toHaveBeenCalled()
    expect(servedFromCache.at(-1)).toMatchObject({ reason: 'backoff', ageMs: 70_000 })
  })

  it('o backoff vale pra API inteira: um par sem cache dá 503 sem chamar a fonte', async () => {
    const provider = await providerRateLimitedAt40s(60_000)
    await provider.getRate('USD', 'BRL')
    fetchRateMock.mockClear()

    await expect(provider.getRate('EUR', 'BRL')).rejects.toMatchObject(unavailable)
    expect(fetchRateMock).not.toHaveBeenCalled()
  })

  it('passado o Retry-After volta a chamar a fonte', async () => {
    const provider = await providerRateLimitedAt40s(60_000) // backoff até t = 100 s
    await provider.getRate('USD', 'BRL')
    fetchRateMock.mockResolvedValueOnce(5.3)

    advanceSeconds(61) // t = 101 s

    expect(await provider.getRate('USD', 'BRL')).toBe(5.3)
  })

  it('durante o backoff, cotação além da idade máxima dá 503 (sem chamar a fonte)', async () => {
    const provider = await providerRateLimitedAt40s(300_000) // backoff até t = 340 s
    await provider.getRate('USD', 'BRL')
    fetchRateMock.mockClear()

    advanceSeconds(85) // t = 125 s: cotação com 125 s > 120 s

    await expect(provider.getRate('USD', 'BRL')).rejects.toMatchObject(unavailable)
    expect(fetchRateMock).not.toHaveBeenCalled()
  })
})

describe('single-flight', () => {
  it('chamadas concorrentes ao mesmo par compartilham UMA requisição', async () => {
    let resolveFetch: (rate: number) => void = () => {}
    fetchRateMock.mockReturnValue(new Promise<number>((resolve) => (resolveFetch = resolve)))
    const provider = newProvider()

    const concurrent = [1, 2, 3, 4, 5].map(() => provider.getRate('USD', 'BRL'))
    resolveFetch(5.1)

    expect(await Promise.all(concurrent)).toEqual([5.1, 5.1, 5.1, 5.1, 5.1])
    expect(fetchRateMock).toHaveBeenCalledTimes(1)
  })

  it('pares diferentes NÃO se compartilham', async () => {
    fetchRateMock.mockResolvedValue(5)
    const provider = newProvider()

    await Promise.all([provider.getRate('USD', 'BRL'), provider.getRate('EUR', 'BRL')])

    expect(fetchRateMock).toHaveBeenCalledTimes(2)
  })

  it('a falha compartilhada chega a todos os concorrentes, com uma única requisição', async () => {
    let rejectFetch: (error: Error) => void = () => {}
    fetchRateMock.mockReturnValue(new Promise<number>((_, reject) => (rejectFetch = reject)))
    const provider = newProvider()

    const concurrent = [1, 2, 3].map(() => provider.getRate('USD', 'BRL').catch((err) => err))
    rejectFetch(new Error('fora'))

    const results = await Promise.all(concurrent)
    expect(results.every((result) => result.code === 'EXCHANGE_RATE_UNAVAILABLE')).toBe(true)
    expect(fetchRateMock).toHaveBeenCalledTimes(1)
  })
})

describe('faixa de sanidade', () => {
  // Cotação boa (5,00) em t = 0; a próxima busca acontece em t = 40 s (cotação vencida).
  async function providerWithGoodQuoteAt0() {
    fetchRateMock.mockResolvedValueOnce(5)
    const provider = newProvider()
    await provider.getRate('USD', 'BRL')
    advanceSeconds(40)
    return provider
  }

  it.each([
    ['+10%', 5.5],
    ['-10%', 4.5],
  ])('cotação nova dentro da faixa (%s) é aceita e cacheada', async (_label, fresh) => {
    const provider = await providerWithGoodQuoteAt0()
    fetchRateMock.mockResolvedValueOnce(fresh)

    expect(await provider.getRate('USD', 'BRL')).toBe(fresh)
    expect(rejectedQuotes).toEqual([])
  })

  it.each([
    ['+20%', 6],
    ['-20%', 4],
  ])('cotação nova que desvia %s da última boa é rejeitada: serve a boa do cache e NÃO cacheia a ruim', async (_label, bad) => {
    const provider = await providerWithGoodQuoteAt0()
    fetchRateMock.mockResolvedValueOnce(bad)

    expect(await provider.getRate('USD', 'BRL')).toBe(5)
    expect(servedFromCache).toEqual([expect.objectContaining({ reason: 'rejected_quote', ageMs: 40_000 })])
    expect(rejectedQuotes).toEqual([
      expect.objectContaining({ pair: 'USD-BRL', rate: bad, lastGoodRate: 5, deviationPercent: 20 }),
    ])

    // A ruim não ficou em cache: a próxima busca (boa) é aceita normalmente.
    fetchRateMock.mockResolvedValueOnce(5.2)
    expect(await provider.getRate('USD', 'BRL')).toBe(5.2)
  })

  it('primeira cotação do par (sem última boa) é aceita, qualquer que seja o valor', async () => {
    fetchRateMock.mockResolvedValueOnce(50)

    expect(await newProvider().getRate('USD', 'BRL')).toBe(50)
  })

  it('a última boa só ancora a sanidade enquanto é recente: passada a idade máxima, a cotação nova é aceita', async () => {
    const provider = await providerWithGoodQuoteAt0()
    advanceSeconds(90) // t = 130 s (> 120 s)
    fetchRateMock.mockResolvedValueOnce(9)

    expect(await provider.getRate('USD', 'BRL')).toBe(9)
  })

  it('rejeitada e sem cotação boa recente pra servir: 503', async () => {
    const provider = await providerWithGoodQuoteAt0()
    advanceSeconds(20) // t = 60 s
    fetchRateMock.mockResolvedValueOnce(9)

    await expect(provider.getRate('USD', 'BRL', { maxAgeMs: 50_000 })).rejects.toMatchObject(unavailable)
  })

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['zero', 0],
    ['negativa', -1],
  ])('cotação %s da fonte nunca vira taxa: 503 sem cache, cache antigo com cache', async (_label, invalid) => {
    fetchRateMock.mockResolvedValueOnce(invalid)
    await expect(newProvider().getRate('USD', 'BRL')).rejects.toMatchObject(unavailable)
    expect(rejectedQuotes).toEqual([expect.objectContaining({ pair: 'USD-BRL' })])

    const provider = await providerWithGoodQuoteAt0()
    fetchRateMock.mockResolvedValueOnce(invalid)
    expect(await provider.getRate('USD', 'BRL')).toBe(5)
  })
})

describe('idade máxima por chamada (execute)', () => {
  it('em falha, o execute só aceita cotação com idade <= 60 s; a simulação segue aceitando até 120 s', async () => {
    fetchRateMock.mockResolvedValueOnce(5).mockRejectedValue(new Error('fonte fora do ar'))
    const provider = newProvider()
    await provider.getRate('USD', 'BRL')

    advanceSeconds(45)
    expect(await provider.getRate('USD', 'BRL', { maxAgeMs: EXECUTE_MAX_AGE_MS })).toBe(5)

    advanceSeconds(20) // idade 65 s
    await expect(provider.getRate('USD', 'BRL', { maxAgeMs: EXECUTE_MAX_AGE_MS })).rejects.toMatchObject(unavailable)
    expect(await provider.getRate('USD', 'BRL')).toBe(5) // simulação: 65 s <= 120 s
  })

  it('limite da chamada menor que o TTL fresco: cotação de 25 s não é "fresca" pra um limite de 20 s', async () => {
    fetchRateMock.mockResolvedValueOnce(5).mockResolvedValueOnce(5.1)
    const provider = newProvider()
    await provider.getRate('USD', 'BRL')
    advanceSeconds(25)

    expect(await provider.getRate('USD', 'BRL', { maxAgeMs: 20_000 })).toBe(5.1)
    expect(fetchRateMock).toHaveBeenCalledTimes(2)
  })

  it('durante o backoff o execute também só aceita cache dentro do seu limite (65 s > 60 s: 503, sem chamar a fonte)', async () => {
    fetchRateMock
      .mockResolvedValueOnce(5)
      .mockRejectedValueOnce(new UpstreamRateLimitedError('429', 300_000))
    const provider = newProvider()
    await provider.getRate('USD', 'BRL')
    advanceSeconds(40)
    await provider.getRate('USD', 'BRL') // recebe o 429 (serve do cache) e abre o backoff
    fetchRateMock.mockClear()
    advanceSeconds(25) // idade 65 s

    await expect(provider.getRate('USD', 'BRL', { maxAgeMs: EXECUTE_MAX_AGE_MS })).rejects.toMatchObject(unavailable)
    expect(await provider.getRate('USD', 'BRL')).toBe(5)
    expect(fetchRateMock).not.toHaveBeenCalled()
  })

  it('single-flight com limites diferentes: uma requisição, e cada chamador aplica o próprio limite ao falhar', async () => {
    fetchRateMock.mockResolvedValueOnce(5)
    const provider = newProvider()
    await provider.getRate('USD', 'BRL')
    advanceSeconds(90) // cotação com 90 s: serve à simulação (120), não ao execute (60)
    let rejectFetch: (error: Error) => void = () => {}
    fetchRateMock.mockReset()
    fetchRateMock.mockReturnValue(new Promise<number>((_, reject) => (rejectFetch = reject)))

    const simulation = provider.getRate('USD', 'BRL')
    const execute = provider.getRate('USD', 'BRL', { maxAgeMs: EXECUTE_MAX_AGE_MS }).catch((err) => err)
    rejectFetch(new Error('fonte fora do ar'))

    expect(await simulation).toBe(5)
    expect(await execute).toMatchObject(unavailable)
    expect(fetchRateMock).toHaveBeenCalledTimes(1)
  })
})
