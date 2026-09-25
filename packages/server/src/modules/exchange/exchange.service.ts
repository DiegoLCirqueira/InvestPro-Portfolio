// @investpro/server
// Service de câmbio. A taxa viva (AwesomeAPI, com cache curto — ver
// exchange.rates.ts) alimenta o câmbio executado, que nunca usa taxa estática.
// A simulação (/rates e /convert), se a fonte falhar, cai em taxas estáticas
// documentadas (BRL como base), marcadas como aproximadas.

import type { Prisma, CurrencyExchange as PrismaCurrencyExchange } from '@prisma/client'
import type {
  ConvertResponse,
  Currency,
  CurrencyHolding,
  CurrencyHoldingList,
  CurrencyListResponse,
  ExchangeRate,
  ExecutableCurrency,
  ExecuteExchangeResponse,
} from '@investpro/shared'
import { AppError } from '../auth/auth.service.js'
import { prisma } from '../../config/database.js'
import { runSerializableTx } from '../../shared/db/serializableTransaction.js'
import {
  availableCurrencies,
  calculateFee,
  convertAmount,
  EXCHANGE_FEE_RATE,
  roundCurrency,
  sanitizeCurrency,
  type RoundingMode,
} from './exchange.domain.js'
import { env } from '../../config/env.js'
import { liveRates } from './exchange.rates.js'
import { recordSnapshot } from '../portfolio/snapshot.service.js'

// Idade máxima da cotação pra EXECUTAR câmbio: mais curta que a da simulação.
const EXECUTE_MAX_RATE_AGE_MS = env.EXCHANGE_EXECUTE_MAX_AGE_SECONDS * 1000

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

function fallbackRate(from: string, to: string): number {
  if (from === to) return 1
  if (to === 'BRL') return brlToCurrency(from)
  if (from === 'BRL') return brlToCurrency(to) > 0 ? 1 / brlToCurrency(to) : 1
  const fromBRL = brlToCurrency(from)
  const toBRL = brlToCurrency(to)
  return toBRL > 0 ? fromBRL / toBRL : 1
}

function toExchangeRate(from: Currency, to: Currency, rate: number, approximate: boolean): ExchangeRate {
  return { from, to, rate, approximate, timestamp: new Date().toISOString() }
}

// Simulação: prefere a cotação viva/cacheada, mas aceita a estática (approximate).
export async function getRate(from: Currency, to: Currency): Promise<ExchangeRate> {
  if (from === to) return toExchangeRate(from, to, 1, false)

  try {
    return toExchangeRate(from, to, await liveRates.getRate(from, to), false)
  } catch {
    return toExchangeRate(from, to, fallbackRate(from, to), true)
  }
}

function buildConversion(
  from: Currency,
  to: Currency,
  amount: number,
  rate: number,
  rounding: RoundingMode = 'nearest'
): ConvertResponse {
  const { fee, convertedAmount } = convertAmount(amount, rate, EXCHANGE_FEE_RATE, to, rounding)
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

export async function convert(
  from: Currency,
  to: Currency,
  amount: number
): Promise<ConvertResponse> {
  const { rate, approximate } = await getRate(from, to)
  return { ...buildConversion(from, to, amount, rate), approximate }
}

export function listCurrencies(base: Currency = 'BRL'): CurrencyListResponse {
  return {
    base: sanitizeCurrency(base),
    items: availableCurrencies(),
  }
}

function toExecuteResponse(record: PrismaCurrencyExchange): ExecuteExchangeResponse {
  return {
    id: record.id,
    fromCurrency: record.fromCurrency as ExecutableCurrency,
    toCurrency: record.toCurrency as ExecutableCurrency,
    amount: record.amount.toNumber(),
    convertedAmount: record.convertedAmount.toNumber(),
    rate: record.rate.toNumber(),
    fee: record.fee.toNumber(),
    createdAt: record.createdAt.toISOString(),
  }
}

// O enum Currency do Postgres ordena pela ordem de declaração (BRL, USD, EUR…),
// não alfabética — por isso o sort é feito aqui e não no orderBy do Prisma.
function byCurrencyAsc(a: CurrencyHolding, b: CurrencyHolding): number {
  return a.currency.localeCompare(b.currency)
}

// Saldos por moeda do usuário (base da "Diversificação" no frontend): só
// holdings ativos e positivos. O BRL não aparece aqui — vive em Portfolio.balance.
export async function listHoldings(userId: string): Promise<CurrencyHoldingList> {
  const holdings = await prisma.currencyHolding.findMany({
    where: { userId, deletedAt: null, balance: { gt: 0 } },
    select: { currency: true, balance: true },
  })

  const items = holdings
    .map(({ currency, balance }) => ({ currency, balance: balance.toNumber() }))
    .sort(byCurrencyAsc)

  return { items }
}

// Debita `amount` de `currency` do usuário: BRL vem do Portfolio.balance,
// qualquer outra moeda vem do CurrencyHolding ativo (sem deletedAt). Nunca deixa
// nenhum dos dois negativo — checa saldo suficiente antes de escrever.
async function debitCurrency(
  tx: Prisma.TransactionClient,
  userId: string,
  currency: ExecutableCurrency,
  amount: number
): Promise<void> {
  if (currency === 'BRL') {
    const portfolio = await tx.portfolio.findUnique({ where: { userId } })
    if (!portfolio) {
      throw new AppError('PORTFOLIO_NOT_FOUND', 'Portfólio não encontrado', 404)
    }
    if (portfolio.balance.toNumber() < amount) {
      throw new AppError(
        'PORTFOLIO_INSUFFICIENT_BALANCE',
        'Saldo insuficiente em BRL para este câmbio',
        400
      )
    }
    await tx.portfolio.update({
      where: { id: portfolio.id },
      data: { balance: { decrement: amount } },
    })
    return
  }

  const holding = await tx.currencyHolding.findUnique({
    where: { userId_currency: { userId, currency }, deletedAt: null },
  })
  if (!holding || holding.balance.toNumber() < amount) {
    throw new AppError(
      'CURRENCY_HOLDING_INSUFFICIENT_BALANCE',
      `Saldo insuficiente em ${currency} para este câmbio`,
      400
    )
  }
  await tx.currencyHolding.update({
    where: { id: holding.id },
    data: { balance: { decrement: amount } },
  })
}

// Credita `amount` de `currency`: BRL vai pro Portfolio.balance, qualquer
// outra moeda vai pro CurrencyHolding (cria se for a primeira vez).
async function creditCurrency(
  tx: Prisma.TransactionClient,
  userId: string,
  currency: ExecutableCurrency,
  amount: number
): Promise<void> {
  if (currency === 'BRL') {
    await tx.portfolio.update({
      where: { userId },
      data: { balance: { increment: amount } },
    })
    return
  }

  await tx.currencyHolding.upsert({
    where: { userId_currency: { userId, currency } },
    create: { userId, currency, balance: amount },
    update: { balance: { increment: amount } },
  })
}

async function executeExchangeTx(
  tx: Prisma.TransactionClient,
  userId: string,
  from: ExecutableCurrency,
  to: ExecutableCurrency,
  amount: number,
  convertedAmount: number,
  rate: number,
  fee: number
): Promise<PrismaCurrencyExchange> {
  await debitCurrency(tx, userId, from, amount)
  await creditCurrency(tx, userId, to, convertedAmount)

  return tx.currencyExchange.create({
    data: { userId, fromCurrency: from, toCurrency: to, amount, convertedAmount, rate, fee },
  })
}

// Crédito que arredonda pra zero (valor pequeno demais pra moeda de destino)
// não pode debitar a origem sem entregar nada.
function assertConvertedAmountIsPositive(convertedAmount: number): void {
  if (convertedAmount > 0) return
  throw new AppError(
    'EXCHANGE_AMOUNT_TOO_SMALL',
    'Valor pequeno demais: a conversão resultaria em zero na moeda de destino',
    400
  )
}

// Câmbio de verdade (debita/credita saldo real), diferente de `convert` (só
// calcula). A cotação é sempre viva (ou do cache dentro da idade máxima; sem
// isso, 503 EXCHANGE_RATE_UNAVAILABLE): o fallback estático deixaria o usuário
// trocar dinheiro real a uma taxa inventada. Cotação/fee são resolvidos fora da
// transação (rede pra AwesomeAPI), com o crédito arredondado pra baixo; a escrita em si roda em transação
// Serializable com retry — mesmo padrão de order/transfer/savings-box (lê
// saldo, decide, escreve).
export async function executeExchange(
  userId: string,
  from: ExecutableCurrency,
  to: ExecutableCurrency,
  amount: number
): Promise<ExecuteExchangeResponse> {
  if (from === to) {
    throw new AppError(
      'EXCHANGE_SAME_CURRENCY',
      'Moeda de origem e destino não podem ser iguais',
      400
    )
  }

  const rate = await liveRates.getRate(from, to, { maxAgeMs: EXECUTE_MAX_RATE_AGE_MS })
  const { convertedAmount, fee } = buildConversion(from, to, amount, rate, 'down')
  assertConvertedAmountIsPositive(convertedAmount)

  const record = await runSerializableTx(
    (tx) => executeExchangeTx(tx, userId, from, to, amount, convertedAmount, rate, fee),
    'EXCHANGE_EXECUTION_CONFLICT',
    'Conflito ao executar o câmbio, tente novamente'
  )

  // A taxa de 1% sai do patrimônio como resultado da operação (não é aporte).
  await recordSnapshot(userId, 'EXCHANGE')
  return toExecuteResponse(record)
}
