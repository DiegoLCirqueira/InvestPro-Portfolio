// @investpro/server
// Testes do exchange.service: getRate, convert, executeExchange (só o caminho sem
// cotação viva), listCurrencies.
// A AwesomeAPI (adapter reusado do market) é mockada para a suite rodar
// determinística e offline. USD/BRL exercita o caminho "ao vivo" (par
// suportado no mock, inclusive a inversão do par reverso); EUR/BRL exercita
// o fallback estático (par não suportado no mock, força a cotação viva a falhar).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { awesomeapiFetchQuotesMock } = vi.hoisted(() => ({
  awesomeapiFetchQuotesMock: vi.fn(),
}))

vi.mock('../../market/adapters/awesomeapi.js', () => ({
  awesomeapiSource: { source: 'awesomeapi', fetchQuotes: awesomeapiFetchQuotesMock },
}))

import { convert, executeExchange, getRate, listCurrencies } from '../exchange.service.js'
import { liveRates } from '../exchange.rates.js'
import { UpstreamRateLimitedError } from '../../market/adapters/errors.js'
import type { SourceAsset } from '../../market/adapters/types.js'

// Só o par USD-BRL é "suportado" pelo mock; os demais lançam erro, forçando o
// fallback estático (mesmo comportamento real do serviço quando a fonte falha).
const MOCKED_RATES: Record<string, number> = {
  'USD-BRL': 5.05,
}

awesomeapiFetchQuotesMock.mockImplementation(async (assets: SourceAsset[]) => {
  const pair = assets[0]?.ticker ?? ''
  const price = MOCKED_RATES[pair]
  if (price === undefined) {
    throw new Error(`AwesomeAPI indisponível (mock) para o par ${pair}`)
  }
  return assets.map((a) => ({
    ticker: a.ticker,
    name: a.name,
    type: a.type,
    price,
    change24h: 0,
    changePercent: 0,
  }))
})

const defaultQuoteImplementation = awesomeapiFetchQuotesMock.getMockImplementation()!

// O cache de cotação é do módulo: zera pra um teste não enxergar o outro.
beforeEach(() => {
  liveRates.reset()
})

describe('getRate', () => {
  it('retorna taxa 1 quando from === to', async () => {
    const result = await getRate('BRL', 'BRL')
    expect(result.rate).toBe(1)
    expect(result.from).toBe('BRL')
    expect(result.to).toBe('BRL')
    expect(typeof result.timestamp).toBe('string')
  })

  it('retorna taxa positiva para par válido (USD→BRL)', async () => {
    const result = await getRate('USD', 'BRL')
    expect(result.rate).toBeGreaterThan(0)
    expect(result.from).toBe('USD')
    expect(result.to).toBe('BRL')
    expect(result.approximate).toBe(false)
  })

  it('sem cotação viva (EUR→BRL) cai na taxa estática, marcada como aproximada', async () => {
    const result = await getRate('EUR', 'BRL')
    expect(result.rate).toBe(5.4)
    expect(result.approximate).toBe(true)
  })

  it('retorna taxa positiva para par reverso (BRL→USD)', async () => {
    const result = await getRate('BRL', 'USD')
    expect(result.rate).toBeGreaterThan(0)
  })
})

describe('convert', () => {
  it('calcula valor convertido para par válido', async () => {
    const result = await convert('USD', 'BRL', 100)
    expect(result.rate).toBeGreaterThan(0)
    expect(result.convertedAmount).toBeGreaterThanOrEqual(0)
    expect(result.amount).toBe(100)
    expect(result.fee).toBeGreaterThanOrEqual(0)
    expect(result).toHaveProperty('timestamp')
  })

  it('mantém convertedAmount positivo para EUR→BRL', async () => {
    const result = await convert('EUR', 'BRL', 50)
    expect(result.convertedAmount).toBeGreaterThanOrEqual(0)
    expect(result.rate).toBeGreaterThan(0)
  })
})

describe('simulação durante o backoff de 429', () => {
  it('serve SÓ do cache (não chama a fonte) e, sem cache, cai na taxa estática marcada como aproximada', async () => {
    await getRate('USD', 'BRL') // cotação viva em cache (5,05)
    awesomeapiFetchQuotesMock.mockRejectedValueOnce(new UpstreamRateLimitedError('429', 60_000))
    expect((await getRate('EUR', 'BRL')).approximate).toBe(true) // o 429 abre o backoff
    awesomeapiFetchQuotesMock.mockClear()

    const cached = await getRate('USD', 'BRL')
    const uncached = await getRate('GBP', 'BRL')
    const converted = await convert('CAD', 'BRL', 10)

    expect(cached).toMatchObject({ rate: 5.05, approximate: false })
    expect(uncached.approximate).toBe(true)
    expect(converted.approximate).toBe(true)
    expect(awesomeapiFetchQuotesMock).not.toHaveBeenCalled()
  })
})

describe('executeExchange: idade máxima da cotação', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    awesomeapiFetchQuotesMock.mockImplementation(defaultQuoteImplementation) // desfaz o mockRejectedValue
  })

  it('cotação em cache com mais de 60 s (fonte indisponível) => 503; a simulação ainda a usa (<= 120 s)', async () => {
    await getRate('USD', 'BRL') // cotação viva em cache (5,05) em t = 0
    awesomeapiFetchQuotesMock.mockRejectedValue(new Error('fonte fora do ar'))
    vi.advanceTimersByTime(61_000)

    await expect(executeExchange('usuario-inexistente', 'BRL', 'USD', 10)).rejects.toMatchObject({
      code: 'EXCHANGE_RATE_UNAVAILABLE',
      statusCode: 503,
    })
    expect(await getRate('USD', 'BRL')).toMatchObject({ rate: 5.05, approximate: false })
  })
})

describe('executeExchange sem cotação viva', () => {
  it('rejeita com 503 EXCHANGE_RATE_UNAVAILABLE em vez de usar a taxa estática, antes de tocar no banco', async () => {
    await expect(executeExchange('usuario-inexistente', 'BRL', 'EUR', 10)).rejects.toMatchObject({
      code: 'EXCHANGE_RATE_UNAVAILABLE',
      statusCode: 503,
    })
  })
})

describe('listCurrencies', () => {
  it('retorna base BRL e moedas suportadas', () => {
    const result = listCurrencies('BRL')
    expect(result.base).toBe('BRL')
    expect(result.items).toContain('USD')
    expect(result.items).toContain('JPY')
    expect(result.items).toContain('EUR')
  })

  it('inclui todas as 9 moedas suportadas', () => {
    const result = listCurrencies('BRL')
    expect(result.items).toHaveLength(9)
  })
})