// @investpro/server
// Testes do exchange.service: getRate, convert, listCurrencies.
// A AwesomeAPI (adapter reusado do market) é mockada para a suite rodar
// determinística e offline. USD/BRL exercita o caminho "ao vivo" (par
// suportado no mock, inclusive a inversão do par reverso); EUR/BRL exercita
// o fallback estático (par não suportado no mock, força fetchLiveRate a falhar).

import { describe, expect, it, vi } from 'vitest'

const { awesomeapiFetchQuotesMock } = vi.hoisted(() => ({
  awesomeapiFetchQuotesMock: vi.fn(),
}))

vi.mock('../../market/adapters/awesomeapi.js', () => ({
  awesomeapiSource: { source: 'awesomeapi', fetchQuotes: awesomeapiFetchQuotesMock },
}))

import { convert, getRate, listCurrencies } from '../exchange.service.js'
import type { SourceAsset } from '../../market/adapters/types.js'

// Só o par USDBRL é "suportado" pelo mock; os demais lançam erro, forçando o
// fallback estático (mesmo comportamento real do serviço quando a fonte falha).
const MOCKED_RATES: Record<string, number> = {
  USDBRL: 5.05,
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