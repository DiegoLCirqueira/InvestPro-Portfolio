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