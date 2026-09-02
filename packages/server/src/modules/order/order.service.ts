// @investpro/server
// Service de ordens. Obtém o preço corrente via Market (getQuote), avalia a
// execução e persiste a ordem via Prisma (model Order).

import type { Order as PrismaOrder } from '@prisma/client'
import type {
  CreateOrderInput,
  Order,
  OrderList,
} from '@investpro/shared'
import { prisma } from '../../config/database.js'
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

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function existingPosition(positions: PortfolioPosition[], ticker: string): PortfolioPosition | undefined {
  return positions.find((p) => p.ticker.toUpperCase() === ticker)
}

function toOrder(record: PrismaOrder): Order {
  return {
    id: record.id,
    assetId: record.assetId,
    ticker: record.ticker,
    side: record.side as Order['side'],
    type: record.type as Order['type'],
    quantity: record.quantity.toNumber(),
    price: record.price ? record.price.toNumber() : null,
    status: record.status as Order['status'],
    createdAt: record.createdAt.toISOString(),
    executedAt: record.executedAt ? record.executedAt.toISOString() : null,
    avgPrice: record.avgPrice ? record.avgPrice.toNumber() : null,
  }
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

  const created = await prisma.order.create({
    data: {
      userId,
      assetId: asset.assetId ?? asset.ticker,
      ticker: asset.ticker,
      side: input.side,
      type: input.type,
      quantity: input.quantity,
      price: input.price ?? evaluation.fillPrice,
      status: evaluation.status,
      avgPrice,
      executedAt: evaluation.status === 'FILLED' ? new Date() : null,
    },
  })

  return toOrder(created)
}

export async function listOrders(
  userId: string,
  page: number,
  limit: number
): Promise<OrderList> {
  const skip = (page - 1) * limit
  const [records, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where: { userId } }),
  ])

  return {
    items: records.map(toOrder),
    total,
    page,
    limit,
  }
}
