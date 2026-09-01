// @investpro/server
// Lógica pura de câmbio: cálculo de conversão, fee, arredondamento e
// sanitização de moedas. Sem dependência de I/O/DB.

import { CURRENCIES } from '@investpro/shared'
import type { Currency } from '@investpro/shared'

export type { Currency }

// Taxa/fee de conversão (spread): 1% sobre o valor em moeda de origem.
export const EXCHANGE_FEE_RATE = 0.01

// Moedas sem casas decimais (arredondamento inteiro).
const ZERO_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set(['JPY'])

export function isSupportedCurrency(code: string): code is Currency {
  return (CURRENCIES as readonly string[]).includes(code.toUpperCase())
}

export function sanitizeCurrency(code: string): Currency {
  const upper = code.trim().toUpperCase()
  if (!isSupportedCurrency(upper)) {
    throw new Error(`Moeda não suportada: ${code}`)
  }
  return upper as Currency
}

export function decimalPlaces(currency: Currency): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2
}

export function roundCurrency(value: number, currency: Currency): number {
  const places = decimalPlaces(currency)
  const factor = 10 ** places
  return Math.round((value + Number.EPSILON) * factor) / factor
}

// fee = valor * taxa (na moeda de origem). Arredondado conforme a moeda.
export function calculateFee(amount: number, rate = EXCHANGE_FEE_RATE): number {
  return amount * rate
}

// convertedAmount = (valor - fee) * rate, na moeda de destino.
export function convertAmount(
  amount: number,
  rate: number,
  feeRate = EXCHANGE_FEE_RATE,
  toCurrency: Currency = 'BRL'
): { fee: number; convertedAmount: number } {
  const fee = amount * feeRate
  const applicable = amount - fee
  const raw = applicable * rate
  return { fee, convertedAmount: roundCurrency(raw, toCurrency) }
}

// Moedas disponíveis ordenadas (lista de conversão).
export function availableCurrencies(): Currency[] {
  return [...CURRENCIES]
}
