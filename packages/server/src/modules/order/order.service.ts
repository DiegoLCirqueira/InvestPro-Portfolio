// @investpro/server
// Service de ordens. Obtém o preço corrente via Market (getQuote) e avalia a
// execução FORA da transação; quando FILLED, persiste Order + Position +
// Portfolio.balance atomicamente via Prisma (isolamento Serializable, com
// retry em conflito de serialização).

import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import type { Order as PrismaOrder } from '@prisma/client'
import {
  MIN_ORDER_TOTAL,
  MIN_ORDER_TOTAL_MESSAGE,
  requiresWholeQuantity,
  WHOLE_QUANTITY_MESSAGE,
} from '@investpro/shared'
import type {
  CreateOrderInput,
  Order,
  OrderList,
  OrderReservations,
  SellableAssetList,
} from '@investpro/shared'
import { prisma } from '../../config/database.js'
import { getAssetMeta, getQuote } from '../market/market.service.js'
import { AppError } from '../auth/auth.service.js'
import { recordSnapshot } from '../portfolio/snapshot.service.js'
import { executeWithdraw } from '../savings-box/savings-box.service.js'
import {
  buyCost,
  freeBalanceShortfall,
  getReservations,
  reservedNote,
  reservedQuantityNote,
  reservedQuantity,
} from './order.reservation.js'
import {
  applyBuyFill,
  applySellFill,
  calculateOrderFee,
  canSell,
  evaluateOrder,
  requiresPrice,
  resolveAsset,
  sellsWholePosition,
  validateOrder,
  type OrderEvaluation,
  type PositionSnapshot,
  type ResolvedAsset,
} from './order.domain.js'

const MAX_TX_ATTEMPTS = 3

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// Ordens anteriores às colunas fee/netAmount: só a taxa estimada, derivada do
// preço/quantidade persistidos (como antes), quando a ordem de fato preencheu.
// Sem netAmount: o preço antigo foi gravado cortado em 2 casas, então um total
// recalculado poderia divergir do que foi debitado/creditado de verdade.
// Usa `price` (preço desta execução), não `avgPrice` (média da Position).
function legacyFee(
  record: PrismaOrder,
  quantity: number,
  price: number | null
): number | null {
  if (record.status !== 'FILLED' || price === null) return null
  return round2(calculateOrderFee(quantity * price))
}

// Abaixo do mínimo, o arredondamento em centavos cria dinheiro (compra de
// R$ 0,0088 cobrada R$ 0,01) e a taxa zera. Vender a posição inteira passa
// mesmo abaixo, senão a sobra fracionada fica presa.
function assertMinimumTotal(total: number, sellsWhole: boolean): void {
  if (total >= MIN_ORDER_TOTAL || sellsWhole) return
  throw new AppError('ORDER_TOTAL_TOO_SMALL', MIN_ORDER_TOTAL_MESSAGE, 400)
}

function insufficientBalance(reserved = 0): AppError {
  return new AppError(
    'ORDER_INSUFFICIENT_BALANCE',
    'Saldo insuficiente para executar esta ordem' + reservedNote(reserved),
    400
  )
}

function insufficientPosition(reserved: number): AppError {
  return new AppError(
    'ORDER_INSUFFICIENT_POSITION',
    'Quantidade insuficiente na posição para venda' + reservedQuantityNote(reserved),
    400
  )
}

// Quantity é Decimal(15,8): somar em float pode criar resíduo (0,1 + 0,2).
function roundQuantity(value: number): number {
  return Math.round(value * 1e8) / 1e8
}

// Venda (a mercado ou OPEN) só usa a posição livre das outras SELL OPEN do ativo.
async function assertFreePosition(
  tx: Prisma.TransactionClient,
  userId: string,
  ticker: string,
  current: PositionSnapshot | null,
  quantity: number
): Promise<PositionSnapshot> {
  const reserved = await reservedQuantity(tx, userId, ticker)
  if (!canSell(current, roundQuantity(quantity + reserved))) throw insufficientPosition(reserved)
  return current
}

// Resgata da Caixinha exatamente o que falta pra compra, com a mesma regra do
// resgate normal. Sem FOR UPDATE: a transação da ordem já é Serializable, então
// duas compras que leem a mesma Caixinha conflitam (P2034) e a perdedora refaz
// com o saldo novo. FOR UPDATE aqui trocaria esse conflito por um erro de SQL
// cru (P2010) que o retry não reconhece.
async function coverShortfallFromSavingsBox(
  tx: Prisma.TransactionClient,
  userId: string,
  shortfall: number,
  orderId: string,
  reserved: number
): Promise<void> {
  try {
    await executeWithdraw(tx, userId, shortfall, orderId)
  } catch (err) {
    // Pra quem compra, o erro é da ordem: saldo + Caixinha não cobrem o custo.
    if (err instanceof AppError && err.code === 'SAVINGS_BOX_INSUFFICIENT_BALANCE') {
      throw insufficientBalance(reserved)
    }
    throw err
  }
}

interface ExecutedOrder {
  record: PrismaOrder
  savingsBoxUsed: number
}

function toOrder(record: PrismaOrder): Order {
  const quantity = record.quantity.toNumber()
  const price = record.price ? record.price.toNumber() : null
  const settled =
    record.fee && record.netAmount
      ? { fee: record.fee.toNumber(), netAmount: record.netAmount.toNumber() }
      : null

  return {
    id: record.id,
    assetId: record.assetId,
    ticker: record.ticker,
    side: record.side as Order['side'],
    type: record.type as Order['type'],
    quantity,
    price,
    status: record.status as Order['status'],
    createdAt: record.createdAt.toISOString(),
    executedAt: record.executedAt ? record.executedAt.toISOString() : null,
    avgPrice: record.avgPrice ? record.avgPrice.toNumber() : null,
    fee: settled?.fee ?? legacyFee(record, quantity, price),
    ...(settled && { netAmount: settled.netAmount }),
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
): Promise<ExecutedOrder> {
  const portfolio = await tx.portfolio.findUnique({ where: { userId } })
  if (!portfolio) {
    throw new AppError('PORTFOLIO_NOT_FOUND', 'Portfólio não encontrado', 404)
  }

  const positionWhere = { portfolioId_ticker: { portfolioId: portfolio.id, ticker: asset.ticker } }
  const position = await tx.position.findUnique({ where: positionWhere })
  const current: PositionSnapshot | null = position
    ? { quantity: position.quantity.toNumber(), avgPrice: position.avgPrice.toNumber() }
    : null

  // Mínimo no preço que avalia a ordem: o informado em LIMIT/STOP, o de
  // mercado em MARKET. LIMIT/STOP que executa na hora é checada de novo no
  // total de execução (abaixo), que é o dinheiro que de fato se move.
  const sellsWhole = input.side === 'SELL' && sellsWholePosition(current, input.quantity)
  const quotedPrice = requiresPrice(input.type) ? (input.price as number) : (evaluation.fillPrice as number)
  assertMinimumTotal(round2(input.quantity * quotedPrice), sellsWhole)

  if (evaluation.status !== 'FILLED') {
    // OPEN não move nada agora, mas reserva: tem que caber no que está livre.
    // Só saldo em conta: a Caixinha não é resgatada pra ordem que fica OPEN.
    if (input.side === 'BUY') {
      const cost = buyCost(round2(input.quantity * quotedPrice))
      const { shortfall, reserved } = await freeBalanceShortfall(tx, userId, portfolio.balance.toNumber(), cost)
      if (shortfall > 0) throw insufficientBalance(reserved)
    } else {
      await assertFreePosition(tx, userId, asset.ticker, current, input.quantity)
    }
    const record = await tx.order.create({
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
    return { record, savingsBoxUsed: 0 }
  }

  const fillPrice = evaluation.fillPrice as number
  const total = round2(input.quantity * fillPrice)
  assertMinimumTotal(total, sellsWhole)

  let orderAvgPrice: number | null = null
  let savingsBoxUsed = 0
  // Gravados na ordem pra o histórico mostrar exatamente o que se moveu no saldo
  // (recalcular depois a partir do preço guardado podia divergir em centavos).
  let fee: number
  let netAmount: number
  // Id definido antes: o resgate da Caixinha (ORDER_FUNDING) acontece antes da
  // Order ser criada e já precisa apontar pra ela no extrato.
  const orderId = randomUUID()

  if (input.side === 'BUY') {
    const cost = buyCost(total)
    // Em centavos, sobre o saldo livre: a Caixinha cobre a diferença exata e o
    // saldo em conta termina no valor reservado, nunca abaixo dele.
    const { shortfall, reserved } = await freeBalanceShortfall(tx, userId, portfolio.balance.toNumber(), cost)

    if (shortfall > 0) {
      if (!input.useSavingsBox) throw insufficientBalance(reserved)
      await coverShortfallFromSavingsBox(tx, userId, shortfall, orderId, reserved)
      savingsBoxUsed = shortfall
    }

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

    // Fee soma ao custo (você paga o valor da ordem + a taxa); não entra no
    // avgPrice/currentValue da Position, que refletem o preço de execução puro.
    await tx.portfolio.update({
      where: { id: portfolio.id },
      data: { balance: { decrement: cost } },
    })

    orderAvgPrice = round2(fill.avgPrice)
    netAmount = cost
    fee = round2(cost - total)
  } else {
    const held = await assertFreePosition(tx, userId, asset.ticker, current, input.quantity)
    const fill = applySellFill(held, input.quantity)

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

    // Fee desconta do valor recebido (você recebe o valor da ordem - a taxa).
    // SELL nunca deixa o balance negativo: só incrementa.
    const proceeds = round2(total - calculateOrderFee(total))

    await tx.portfolio.update({
      where: { id: portfolio.id },
      data: { balance: { increment: proceeds } },
    })

    orderAvgPrice = null
    netAmount = proceeds
    fee = round2(total - proceeds)
  }

  const record = await tx.order.create({
    data: {
      id: orderId,
      userId,
      assetId: asset.assetId ?? asset.ticker,
      ticker: asset.ticker,
      side: input.side,
      type: input.type,
      quantity: input.quantity,
      price: fillPrice, // preço de execução (o limite/gatilho só vale enquanto OPEN)
      status: 'FILLED',
      avgPrice: orderAvgPrice,
      fee,
      netAmount,
      executedAt: new Date(),
    },
  })
  return { record, savingsBoxUsed }
}

export async function createOrder(userId: string, input: CreateOrderInput): Promise<Order> {
  const errors = validateOrder(input)
  if (errors.length > 0) {
    throw new AppError('ORDER_INVALID', errors.join('; '), 400)
  }

  const asset = resolveAsset(input)

  if (input.side === 'BUY' && !Number.isInteger(input.quantity)) {
    const meta = await getAssetMeta(asset.ticker)
    if (meta && requiresWholeQuantity(meta.type)) {
      throw new AppError('ORDER_INVALID', WHOLE_QUANTITY_MESSAGE, 400)
    }
  }

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
      const { record, savingsBoxUsed } = await prisma.$transaction(
        (tx) => executeOrderTx(tx, userId, asset, input, evaluation),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
      // Mesmo rastro de um resgate normal (fotografia SAVINGS) antes da ORDER.
      if (savingsBoxUsed > 0) await recordSnapshot(userId, 'SAVINGS')
      if (record.status === 'FILLED') await recordSnapshot(userId, 'ORDER')
      const order = toOrder(record)
      return input.useSavingsBox ? { ...order, savingsBoxUsed } : order
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

// Cancela a ordem que ainda não executou; a reserva some junto, porque ela é
// lida das ordens OPEN. O UPDATE condicional é atômico: de duas chamadas
// simultâneas só uma acha a linha OPEN/PENDING, a outra recebe 409.
export async function cancelOrder(userId: string, orderId: string): Promise<Order> {
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, userId, status: { in: ['OPEN', 'PENDING'] } },
    data: { status: 'CANCELLED' },
  })
  // Ordem de outra conta responde igual a inexistente: não revela que o id existe.
  const record = await prisma.order.findFirst({ where: { id: orderId, userId } })
  if (!record) {
    throw new AppError('ORDER_NOT_FOUND', 'Ordem não encontrada', 404)
  }
  if (count === 0) {
    throw new AppError('ORDER_NOT_CANCELLABLE', 'Só ordens abertas podem ser canceladas', 409)
  }
  return toOrder(record)
}

export async function getOrderReservations(userId: string): Promise<OrderReservations> {
  return getReservations(prisma, userId)
}

// Ativos que o usuário pode vender agora: só tickers com Position ativa
// (quantity > 0), diferente do catálogo completo de /market/assets.
export async function listSellableAssets(userId: string): Promise<SellableAssetList> {
  const portfolio = await prisma.portfolio.findUnique({
    where: { userId, deletedAt: null },
    select: {
      positions: {
        where: { deletedAt: null, quantity: { gt: 0 } },
        select: { ticker: true, quantity: true },
        orderBy: { ticker: 'asc' },
      },
    },
  })

  return {
    items: (portfolio?.positions ?? []).map((p) => ({
      ticker: p.ticker,
      quantity: p.quantity.toNumber(),
    })),
  }
}
