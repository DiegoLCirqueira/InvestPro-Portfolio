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
// atinge o limite; STOP executa quando o preço cruza o gatilho (sempre a preço
// de mercado — ver evaluateOrder).
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

// O preço informado (limite/gatilho) só decide SE a ordem executa; a execução é
// sempre a preço de mercado. Usá-lo como preço de execução deixava o usuário
// escolher o próprio preço (STOP BUY a 0,01 sempre dispara e compra a 0,01).
// Em LIMIT, executar a mercado já é o melhor preço dentro do limite: só
// executa quando o mercado está no limite ou melhor (BUY: min(limite, mercado)
// e SELL: max(limite, mercado) resultam sempre em mercado).
export function evaluateOrder(input: CreateOrderInput, marketPrice: number): OrderEvaluation {
  if (!isExecutableAt(input.type, input.side, input.price, marketPrice)) {
    return { status: 'OPEN', fillPrice: null, total: null }
  }
  return { status: 'FILLED', fillPrice: marketPrice, total: input.quantity * marketPrice }
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

// Fee da InvestPro sobre o valor executado da ordem — mesmo padrão de
// exchange.domain.ts (1% sobre o valor bruto). Cobrada em cima do total (BUY
// soma ao custo, SELL desconta do valor recebido); não afeta avgPrice/quantity
// da Position, que continuam refletindo o preço de execução puro.
export const ORDER_FEE_RATE = 0.01

export function calculateOrderFee(total: number): number {
  return total * ORDER_FEE_RATE
}

export interface PositionSnapshot {
  quantity: number
  avgPrice: number
}

export interface PositionFillResult {
  quantity: number
  avgPrice: number
  currentValue: number
}

// BUY: soma a quantidade e recalcula a média ponderada via newAveragePrice.
export function applyBuyFill(
  current: PositionSnapshot | null,
  filledQuantity: number,
  fillPrice: number
): PositionFillResult {
  const currentQuantity = current?.quantity ?? 0
  const quantity = currentQuantity + filledQuantity
  const avgPrice = newAveragePrice(current?.avgPrice, currentQuantity, filledQuantity, fillPrice)
  return { quantity, avgPrice, currentValue: quantity * avgPrice }
}

// Só pode vender com posição existente e quantidade suficiente.
export function canSell(current: PositionSnapshot | null, sellQuantity: number): current is PositionSnapshot {
  return current !== null && current.quantity >= sellQuantity
}

const POSITION_DUST_THRESHOLD = 1e-8

// A venda zera a posição (residual dentro da tolerância de ponto flutuante).
export function sellsWholePosition(current: PositionSnapshot | null, sellQuantity: number): boolean {
  return current !== null && current.quantity - sellQuantity <= POSITION_DUST_THRESHOLD
}

// SELL: reduz a quantidade sem recalcular avgPrice. Retorna null quando a
// venda zera a posição.
export function applySellFill(current: PositionSnapshot, filledQuantity: number): PositionFillResult | null {
  if (sellsWholePosition(current, filledQuantity)) return null
  const quantity = current.quantity - filledQuantity
  return { quantity, avgPrice: current.avgPrice, currentValue: quantity * current.avgPrice }
}
