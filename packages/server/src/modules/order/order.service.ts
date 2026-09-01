// @investpro/server
// Service de ordens. Obtém o preço corrente via Market (getQuote), avalia a
// execução e registra a ordem.
//
// PERSISTÊNCIA: ainda não existe modelo/tabela "Order" no schema do Prisma.
// Até a migração correspondente, as ordens são mantidas em memória por usuário
// (não sobrevivem a restart). Quando o modelo for criado, trocar o store por
// um prisma.$transaction. NÃO alteramos market nem portfolio.

import type {
  CreateOrderInput,
  Order,
  OrderList,
} from '@investpro/shared'
import { getQuote } from '../market/market.service.js'
import { getPortfolio } from '../portfolio/portfolio.service.js'
import type { PortfolioPosition } from './order.types.js'
import { AppError } from '../auth/auth.service.js'
import {
  evaluateOrder,
  newAveragePrice,
  resolveAsset,
  validateOrder,
} from './order.domain.js'

const store = new Map<string, Order[]>()

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function existingPosition(positions: PortfolioPosition[], ticker: string): PortfolioPosition | undefined {
  return positions.find((p) => p.ticker.toUpperCase() === ticker)
}

export async function createOrder(userId: string, input: CreateOrderInput): Promise<Order> {
  const errors = validateOrder(input)
  if (errors.length > 0) {
    throw new AppError('ORDER_INVALID', errors.join('; '), 400)
  }

  const asset = resolveAsset(input)

  // Preço corrente do ativo via Market (não requer DB; mercado usa cache/fallback).
  const quote = await getQuote(asset.ticker).catch((err) => {
    if (err instanceof AppError) throw err
    throw new AppError(
      'ORDER_PRICE_UNAVAILABLE',
      'Não foi possível obter o preço do ativo para esta ordem',
      503
    )
  })

  const evaluation = evaluateOrder(input, quote.price)

  let avgPrice: number | null = null
  if (evaluation.status === 'FILLED' && input.side === 'BUY' && evaluation.fillPrice !== null) {
    let positions: PortfolioPosition[] = []
    try {
      const portfolio = await getPortfolio(userId)
      positions = portfolio.positions
    } catch {
      // Sem posição existente resolvível (portfólio/DB indisponível): assume vazio.
      positions = []
    }
    const current = existingPosition(positions, asset.ticker)
    avgPrice = round2(
      newAveragePrice(
        current?.avgPrice,
        current?.quantity ?? 0,
        input.quantity,
        evaluation.fillPrice
      )
    )
  }

  const order: Order = {
    id: generateId(),
    assetId: asset.assetId ?? asset.ticker,
    ticker: asset.ticker,
    side: input.side,
    type: input.type,
    quantity: input.quantity,
    price: input.price ?? evaluation.fillPrice,
    status: evaluation.status,
    createdAt: new Date().toISOString(),
    executedAt: evaluation.status === 'FILLED' ? new Date().toISOString() : null,
    avgPrice,
  }

  const userOrders = store.get(userId) ?? []
  userOrders.push(order)
  store.set(userId, userOrders)

  return order
}

export async function listOrders(
  userId: string,
  page: number,
  limit: number
): Promise<OrderList> {
  const userOrders = store.get(userId) ?? []
  const start = (page - 1) * limit
  return {
    items: userOrders.slice(start, start + limit),
    total: userOrders.length,
    page,
    limit,
  }
}
