// @investpro/server
// Patrimônio total e fotografias (PortfolioSnapshot) que alimentam o gráfico
// "Evolução do Patrimônio" e as métricas de risco.

import type { Currency, Prisma, SnapshotReason } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'
import { prisma } from '../../config/database.js'
import { getRate } from '../exchange/exchange.service.js'
import { transferFee, type TransferType } from '../transfer/transfer.domain.js'
import { backfillFromCashFlows, dayKey } from './history.domain.js'

/**
 * Patrimônio em BRL: caixa + posições (valor de mercado) + caixinha + moedas
 * estrangeiras convertidas. Sem caixinha/moedas, guardar dinheiro nelas
 * pareceria perda no gráfico.
 */
export async function computeEquity(userId: string): Promise<number> {
  const [portfolio, savingsBox, holdings] = await Promise.all([
    prisma.portfolio.findUnique({
      where: { userId },
      select: { balance: true, positions: { where: { deletedAt: null }, select: { currentValue: true } } },
    }),
    prisma.savingsBox.findUnique({ where: { userId }, select: { balance: true, deletedAt: true } }),
    prisma.currencyHolding.findMany({
      where: { userId, deletedAt: null, balance: { gt: 0 } },
      select: { currency: true, balance: true },
    }),
  ])

  const cash = portfolio ? portfolio.balance.toNumber() : 0
  const positions = portfolio?.positions.reduce((sum, p) => sum + p.currentValue.toNumber(), 0) ?? 0
  const savings = savingsBox && !savingsBox.deletedAt ? savingsBox.balance.toNumber() : 0
  const foreign = await foreignHoldingsInBrl(holdings)

  return Math.round((cash + positions + savings + foreign) * 100) / 100
}

/** Saldos em moeda estrangeira do usuário, convertidos para BRL. */
export async function foreignCurrencyValueInBrl(userId: string): Promise<number> {
  const holdings = await prisma.currencyHolding.findMany({
    where: { userId, deletedAt: null, balance: { gt: 0 } },
    select: { currency: true, balance: true },
  })
  return Math.round((await foreignHoldingsInBrl(holdings)) * 100) / 100
}

// Valorização pra exibição (não execução): aceita a cotação de referência
// quando a fonte ao vivo está fora, como a simulação de câmbio.
async function foreignHoldingsInBrl(
  holdings: ReadonlyArray<{ currency: Currency; balance: { toNumber(): number } }>
): Promise<number> {
  const values = await Promise.all(
    holdings.map(async ({ currency, balance }) => {
      const { rate } = await getRate(currency, 'BRL')
      return balance.toNumber() * rate
    })
  )
  return values.reduce((sum, value) => sum + value, 0)
}

/**
 * Grava a fotografia do patrimônio depois de uma operação que mexeu no
 * dinheiro. Nunca derruba a operação (que já foi concluída): falha só é
 * registrada em log — o próximo evento/dia recompõe a série.
 */
export async function recordSnapshot(
  userId: string,
  reason: SnapshotReason,
  netFlow = 0,
  log?: Pick<FastifyBaseLogger, 'warn'>
): Promise<void> {
  try {
    const equity = await computeEquity(userId)
    await prisma.portfolioSnapshot.create({ data: { userId, equity, netFlow, reason } })
  } catch (err) {
    log?.warn({ err, userId, reason }, 'snapshot do patrimônio não gravado')
  }
}

async function cashFlowEvents(userId: string) {
  const [topUps, transfers] = await Promise.all([
    prisma.balanceTopUp.findMany({ where: { userId }, select: { createdAt: true, amount: true } }),
    prisma.transfer.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { createdAt: true, amount: true, type: true },
    }),
  ])
  return [
    ...topUps.map((t) => ({ createdAt: t.createdAt, amount: t.amount.toNumber() })),
    ...transfers.map((t) => ({
      createdAt: t.createdAt,
      amount: -(t.amount.toNumber() + transferFee(t.type as TransferType)),
    })),
  ]
}

type SnapshotReader = Pick<Prisma.TransactionClient, 'portfolioSnapshot'>

async function snapshotState(client: SnapshotReader, userId: string) {
  const [last, first, seeded] = await Promise.all([
    client.portfolioSnapshot.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    client.portfolioSnapshot.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, equity: true, netFlow: true },
    }),
    client.portfolioSnapshot.findFirst({ where: { userId, reason: { in: ['DAILY', 'BACKFILL'] } }, select: { id: true } }),
  ])
  return { last, first, seeded }
}

// A DAILY também marca a conta como já reconstruída (seeded).
function needsDailySnapshot({ last, seeded }: Awaited<ReturnType<typeof snapshotState>>, now: Date): boolean {
  return !seeded || !last || dayKey(last.createdAt) !== dayKey(now)
}

/**
 * Garante as fotografias que o histórico precisa, com o patrimônio atual já
 * calculado: na primeira vez, reconstrói o passado a partir dos aportes e
 * transferências (BACKFILL); depois, uma fotografia DAILY por dia.
 * Quase toda visita cai no caminho rápido (nada a gravar, sem transação). O
 * lock por usuário não espera: se outra requisição já está gravando, esta
 * segue com o que existe (esperar estourava o tempo da transação).
 */
export async function ensureSnapshots(userId: string, currentEquity: number, now = new Date()): Promise<void> {
  if (!needsDailySnapshot(await snapshotState(prisma, userId), now)) return

  await prisma.$transaction(async (tx) => {
    const [{ locked }] = await tx.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_xact_lock(hashtext(${`portfolio-snapshot:${userId}`})) AS locked`
    if (!locked) return

    // Relido dentro do lock: outra requisição pode ter gravado no meio tempo.
    const state = await snapshotState(tx, userId)
    const { first, seeded } = state

    if (!seeded) {
      // Só o que aconteceu antes da primeira fotografia (uma operação feita
      // antes de abrir o painel já gravou a sua), partindo do patrimônio
      // imediatamente anterior a ela.
      const before = first?.createdAt ?? now
      const baseline = first ? first.equity.toNumber() - first.netFlow.toNumber() : currentEquity
      const events = (await cashFlowEvents(userId)).filter((event) => event.createdAt < before)
      const backfill = backfillFromCashFlows(baseline, events)
      if (backfill.length > 0) {
        await tx.portfolioSnapshot.createMany({
          data: backfill.map((point) => ({ userId, ...point, reason: 'BACKFILL' as const })),
        })
      }
    }

    if (needsDailySnapshot(state, now)) {
      await tx.portfolioSnapshot.create({ data: { userId, equity: currentEquity, reason: 'DAILY' } })
    }
  })
}
