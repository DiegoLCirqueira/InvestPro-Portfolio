// @investpro/server
// Service de ordens. Obtém o preço corrente via Market (getQuote) e avalia a
// execução FORA da transação; quando FILLED, persiste Order + Position +
// Portfolio.balance atomicamente via Prisma (isolamento Serializable, com
// retry em conflito de serialização).

import { Prisma } from '@prisma/client'
import type { Order as PrismaOrder } from '@prisma/client'
import type {
  CreateOrderInput,
  Order,
  OrderList,
} from '@investpro/shared'
import { prisma } from '../../config/database.js'
import { getAssetMeta, getQuote } from '../market/market.service.js'
import { AppError } from '../auth/auth.service.js'
import {
  applyBuyFill,
  applySellFill,
  canSell,
  evaluateOrder,
  resolveAsset,
  validateOrder,
  type OrderEvaluation,
  type PositionSnapshot,
  type ResolvedAsset,
} from './order.domain.js'

const MAX_TX_ATTEMPTS = 3

function round2(value: number): number {
  return Math.round(value * 100) / 100
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

// Executa a criação da Order e, se FILLED, a atualização atômica de Position
// e Portfolio.balance. Deve rodar dentro de uma transação Serializable.
async function executeOrderTx(
  tx: Prisma.TransactionClient,
  userId: string,
  asset: ResolvedAsset,
  input: CreateOrderInput,
  evaluation: OrderEvaluation
): Promise<PrismaOrder> {
  if (evaluation.status !== 'FILLED') {
    return tx.order.create({
      data: {
        userId,
        assetId: asset.assetId ?? asset.ticker,
        ticker: asset.ticker,
        side: input.side,
        type: input.type,
        quantity: input.quantity,
        price: input.price ?? null,
        status: evaluation.status,
        avgPrice: null,
        executedAt: null,
      },
    })
  }

  const fillPrice = evaluation.fillPrice as number

  const portfolio = await tx.portfolio.findUnique({ where: { userId } })
  if (!portfolio) {
    throw new AppError('PORTFOLIO_NOT_FOUND', 'Portfólio não encontrado', 404)
  }

  const positionWhere = { portfolioId_ticker: { portfolioId: portfolio.id, ticker: asset.ticker } }
  const position = await tx.position.findUnique({ where: positionWhere })
  const current: PositionSnapshot | null = position
    ? { quantity: position.quantity.toNumber(), avgPrice: position.avgPrice.toNumber() }
    : null

  let orderAvgPrice: number | null = null

  if (input.side === 'BUY') {
    const fill = applyBuyFill(current, input.quantity, fillPrice)

    const meta = await getAssetMeta(asset.ticker)
    if (!meta) {
      throw new AppError(
        'ASSET_META_MISSING',
        `Metadados do ativo ${asset.ticker} não encontrados`,
        500
      )
    }

    await tx.position.upsert({
      where: positionWhere,
      create: {
        portfolioId: portfolio.id,
        ticker: asset.ticker,
        name: meta.name,
        type: meta.type as Prisma.PositionCreateInput['type'],
        quantity: fill.quantity,
        avgPrice: fill.avgPrice,
        currentValue: fill.currentValue,
      },
      update: {
        quantity: fill.quantity,
        avgPrice: fill.avgPrice,
        currentValue: fill.currentValue,
      },
    })

    await tx.portfolio.update({
      where: { id: portfolio.id },
      data: { balance: { decrement: round2(input.quantity * fillPrice) } },
    })

    orderAvgPrice = round2(fill.avgPrice)
  } else {
    if (!canSell(current, input.quantity)) {
      throw new AppError(
        'ORDER_INSUFFICIENT_POSITION',
        'Quantidade insuficiente na posição para venda',
        400
      )
    }

    const fill = applySellFill(current, input.quantity)

    if (fill) {
      await tx.position.update({
        where: positionWhere,
        data: {
          quantity: fill.quantity,
          avgPrice: fill.avgPrice,
          currentValue: fill.currentValue,
        },
      })
    } else {
      await tx.position.delete({ where: positionWhere })
    }

    await tx.portfolio.update({
      where: { id: portfolio.id },
      data: { balance: { increment: round2(input.quantity * fillPrice) } },
    })

    orderAvgPrice = null
  }

  return tx.order.create({
    data: {
      userId,
      assetId: asset.assetId ?? asset.ticker,
      ticker: asset.ticker,
      side: input.side,
      type: input.type,
      quantity: input.quantity,
      price: input.price ?? fillPrice,
      status: 'FILLED',
      avgPrice: orderAvgPrice,
      executedAt: new Date(),
    },
  })
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

  for (let attempt = 1; attempt <= MAX_TX_ATTEMPTS; attempt++) {
    try {
      const created = await prisma.$transaction(
        (tx) => executeOrderTx(tx, userId, asset, input, evaluation),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
      return toOrder(created)
    } catch (err) {
      const isSerializationConflict =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034'
      if (isSerializationConflict && attempt < MAX_TX_ATTEMPTS) {
        continue
      }
      if (isSerializationConflict) {
        throw new AppError(
          'ORDER_EXECUTION_CONFLICT',
          'Conflito ao executar a ordem, tente novamente',
          409
        )
      }
      throw err
    }
  }

  // Inalcançável: o loop sempre retorna ou lança dentro das MAX_TX_ATTEMPTS iterações.
  throw new AppError('ORDER_EXECUTION_CONFLICT', 'Conflito ao executar a ordem, tente novamente', 409)
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
