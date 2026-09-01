// @investpro/server
// Lógica pura de ordens (compra/venda de ativos). Sem dependência de I/O/DB.
// Funções determinísticas e testáveis isoladamente.

import {
  ORDER_SIDES,
  ORDER_STATUSES,
  ORDER_TYPES,
} from '@investpro/shared'
import type { CreateOrderInput } from '@investpro/shared'

export type OrderSide = (typeof ORDER_SIDES)[number]
export type OrderType = (typeof ORDER_TYPES)[number]
export type OrderStatus = (typeof ORDER_STATUSES)[number]

// Ordem MARKET é executada sempre; LIMIT executa quando o preço de mercado
// atinge o limite; STOP executa quando o preço cruza o gatilho.
export function requiresPrice(type: OrderType): boolean {
  return type === 'LIMIT' || type === 'STOP'
}

export function validateOrder(input: CreateOrderInput): string[] {
  const errors: string[] = []
  if (!input.assetId && !input.ticker) errors.push('Informe assetId ou ticker')
  if (!(input.quantity > 0)) errors.push('Quantidade deve ser positiva')
  if (requiresPrice(input.type) && !(input.price && input.price > 0)) {
    errors.push('Ordens LIMIT/STOP exigem preço positivo')
  }
  return errors
}

export interface ResolvedAsset {
  ticker: string
  assetId: string | null
}

// Resolve o ticker a partir de assetId ou ticker. Se só assetId for fornecido,
// usa um lookup externo (ex.: ativos do market). Sem resolução, usa o ticker.
export function resolveAsset(
  input: Pick<CreateOrderInput, 'assetId' | 'ticker'>,
  lookup: (key: string) => ResolvedAsset | null = () => null
): ResolvedAsset {
  const key = input.ticker ?? input.assetId
  if (!key) throw new Error('Informe assetId ou ticker')
  const resolved = lookup(key)
  if (resolved) return resolved
  return { ticker: key.toUpperCase(), assetId: input.assetId ?? null }
}

export interface OrderEvaluation {
  status: OrderStatus
  fillPrice: number | null
  total: number | null
}

// Decide se a ordem executaria no preço de mercado atual.
export function isExecutableAt(
  type: OrderType,
  side: OrderSide,
  limitPrice: number | undefined,
  marketPrice: number
): boolean {
  if (type === 'MARKET') return true
  if (limitPrice === undefined) return false
  if (type === 'LIMIT') {
    return side === 'BUY' ? marketPrice <= limitPrice : marketPrice >= limitPrice
  }
  // STOP
  return side === 'BUY' ? marketPrice >= limitPrice : marketPrice <= limitPrice
}

export function evaluateOrder(input: CreateOrderInput, marketPrice: number): OrderEvaluation {
  if (input.type === 'MARKET') {
    return { status: 'FILLED', fillPrice: marketPrice, total: input.quantity * marketPrice }
  }
  if (input.price !== undefined && isExecutableAt(input.type, input.side, input.price, marketPrice)) {
    return { status: 'FILLED', fillPrice: input.price, total: input.quantity * input.price }
  }
  return { status: 'OPEN', fillPrice: null, total: null }
}

// Preço médio ponderado após nova compra:
//   (avgAtual * qtdAtual + preçoFill * qtdNova) / (qtdAtual + qtdNova)
export function newAveragePrice(
  existingAvg: number | null | undefined,
  existingQty: number,
  addedQty: number,
  fillPrice: number
): number {
  const totalQty = existingQty + addedQty
  if (totalQty <= 0) return fillPrice
  const baseCost = (existingAvg ?? 0) * existingQty
  const addedCost = addedQty * fillPrice
  return (baseCost + addedCost) / totalQty
}

export function computeTotal(quantity: number, fillPrice: number): number {
  return quantity * fillPrice
}
