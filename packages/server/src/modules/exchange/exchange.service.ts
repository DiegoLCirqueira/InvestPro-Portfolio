// @investpro/server
// Service de câmbio. Obtém a taxa real via AwesomeAPI (reuso do adapter do
// market) para o par from→to e calcula a conversão com fee. Se a fonte falhar,
// usa fallback de taxas estáticas documentadas (BRL como base).

import type {
  ConvertResponse,
  Currency,
  CurrencyListResponse,
  ExchangeRate,
} from '@investpro/shared'
import { awesomeapiSource } from '../market/adapters/awesomeapi.js'
import {
  availableCurrencies,
  calculateFee,
  convertAmount,
  roundCurrency,
  sanitizeCurrency,
} from './exchange.domain.js'

// Fallback estático (BRL base) usado se a AwesomeAPI estiver indisponível.
// Taxas aproximadas de referência — DOCUMENTADO como aproximação.
const FALLBACK_RATES: Record<string, number> = {
  USD: 5.0,
  EUR: 5.4,
  GBP: 6.3,
  JPY: 0.034,
  CHF: 5.6,
  CAD: 3.7,
  AUD: 3.3,
  CNY: 0.7,
}

function brlToCurrency(code: string): number {
  return FALLBACK_RATES[code] ?? 1
}

// Taxa de from→to usando AwesomeAPI (par `${from}${to}`). Se o par direto não
// existir, tenta o inverso e inverte. Lança erro se indisponível.
async function fetchLiveRate(from: string, to: string): Promise<number> {
  const pairs = [`${from}${to}`, `${to}${from}`]
  let lastError: unknown

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]
    const asset = {
      id: pair,
      ticker: pair,
      name: pair,
      type: 'FIXED_INCOME' as const,
      remoteId: pair,
    }
    try {
      const quotes = await awesomeapiSource.fetchQuotes([asset])
      const price = quotes[0]?.price
      if (price !== undefined && price > 0) {
        // No par direto `${from}${to}` o preço já é from→to; no inverso inverte.
        return i === 0 ? price : 1 / price
      }
    } catch (err) {
      lastError = err
    }
  }

  throw lastError ?? new Error('AwesomeAPI: par indisponível')
}

function fallbackRate(from: string, to: string): number {
  if (from === to) return 1
  if (to === 'BRL') return brlToCurrency(from)
  if (from === 'BRL') return brlToCurrency(to) > 0 ? 1 / brlToCurrency(to) : 1
  const fromBRL = brlToCurrency(from)
  const toBRL = brlToCurrency(to)
  return toBRL > 0 ? fromBRL / toBRL : 1
}

export async function getRate(from: Currency, to: Currency): Promise<ExchangeRate> {
  const rate =
    from === to
      ? 1
      : await fetchLiveRate(from, to).catch(() => fallbackRate(from, to))

  return {
    from,
    to,
    rate,
    timestamp: new Date().toISOString(),
  }
}

export async function convert(
  from: Currency,
  to: Currency,
  amount: number
): Promise<ConvertResponse> {
  const rate = (await getRate(from, to)).rate
  const { fee, convertedAmount } = convertAmount(amount, rate, 0.01, to)
  return {
    from,
    to,
    amount,
    convertedAmount,
    rate,
    fee: roundCurrency(fee, from),
    timestamp: new Date().toISOString(),
  }
}

export function listCurrencies(base: Currency = 'BRL'): CurrencyListResponse {
  return {
    base: sanitizeCurrency(base),
    items: availableCurrencies(),
  }
}
