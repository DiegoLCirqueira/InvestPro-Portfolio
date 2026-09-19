import { describe, expect, it } from 'vitest'
import {
  availableCurrencies,
  calculateFee,
  convertAmount,
  decimalPlaces,
  isSupportedCurrency,
  roundCurrency,
  sanitizeCurrency,
} from '../exchange.domain.js'

describe('sanitizeCurrency', () => {
  it('normaliza para maiúsculas', () => {
    expect(sanitizeCurrency('usd')).toBe('USD')
  })

  it('lança erro para moeda não suportada', () => {
    expect(() => sanitizeCurrency('XXX')).toThrow('Moeda não suportada')
  })

  it('isSupportedCurrency', () => {
    expect(isSupportedCurrency('BRL')).toBe(true)
    expect(isSupportedCurrency('btc')).toBe(false)
  })
})

describe('decimalPlaces / roundCurrency', () => {
  it('JPY tem 0 casas decimais, demais 2', () => {
    expect(decimalPlaces('JPY')).toBe(0)
    expect(decimalPlaces('BRL')).toBe(2)
  })

  it('arredonda conforme a moeda', () => {
    expect(roundCurrency(1.2345, 'BRL')).toBe(1.23)
    expect(roundCurrency(1.5, 'JPY')).toBe(2)
  })

  it('modo down trunca na precisão da moeda (nunca cria valor)', () => {
    expect(roundCurrency(0.58, 'JPY', 'down')).toBe(0) // 'nearest' daria 1
    expect(roundCurrency(1.999, 'BRL', 'down')).toBe(1.99) // 'nearest' daria 2
  })

  it('modo down não perde 1 unidade por ruído de ponto flutuante', () => {
    expect(roundCurrency(197.99999999999997, 'BRL', 'down')).toBe(198)
    expect(roundCurrency(291.0000000000001, 'JPY', 'down')).toBe(291)
  })
})

describe('calculateFee', () => {
  it('1% do valor', () => {
    expect(calculateFee(1000)).toBe(10)
    expect(calculateFee(500, 0.01)).toBe(5)
  })
})

describe('convertAmount', () => {
  it('aplica fee antes de converter', () => {
    const { fee, convertedAmount } = convertAmount(1000, 5, 0.01, 'BRL')
    expect(fee).toBe(10)
    expect(convertedAmount).toBe(4950) // (1000 - 10) * 5
  })

  it('arredonda no destino', () => {
    const { convertedAmount } = convertAmount(100, 5.5555, 0.01, 'BRL')
    expect(convertedAmount).toBeCloseTo(549.99) // ~= (100-1)*5.5555
  })

  it('com rounding down o crédito é truncado: R$ 0,02 -> JPY não vira ¥1', () => {
    const rateBrlToJpy = 1 / 0.034
    expect(convertAmount(0.02, rateBrlToJpy, 0.01, 'JPY').convertedAmount).toBe(1)
    expect(convertAmount(0.02, rateBrlToJpy, 0.01, 'JPY', 'down').convertedAmount).toBe(0)
  })

  it('fee zero resulta em conversão do valor integral', () => {
    const { convertedAmount } = convertAmount(100, 2, 0, 'BRL')
    expect(convertedAmount).toBe(200)
  })
})

describe('availableCurrencies', () => {
  it('lista contém BRL e USD', () => {
    const list = availableCurrencies()
    expect(list).toContain('BRL')
    expect(list).toContain('USD')
  })
})