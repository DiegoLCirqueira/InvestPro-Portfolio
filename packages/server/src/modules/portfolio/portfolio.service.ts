import type { FastifyBaseLogger } from "fastify";
import { prisma } from "../../config/database.js";
import { AppError } from "../auth/auth.service.js";
import type { HistoryQuery } from "./portfolio.schema.js";
import { calculateDiversification } from "./portfolio.domain.js";
import { buildDailySeries, buildIntradaySeries, timeWeightedReturnPct } from "./history.domain.js";
import { computeEquity, ensureSnapshots, foreignCurrencyValueInBrl, recordSnapshot } from "./snapshot.service.js";

export async function getPortfolio(userId: string) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { userId, deletedAt: null },
    include: {
      positions: {
        where: { deletedAt: null },
        orderBy: { currentValue: "desc" },
      },
    },
  });

  if (!portfolio) {
    throw new AppError("PORTFOLIO_NOT_FOUND", "Portfólio não encontrado", 404);
  }

  return {
    id: portfolio.id,
    balance: Number(portfolio.balance),
    // Mesmo cálculo do gráfico de evolução (caixa + posições + caixinha +
    // moedas em BRL): o card "Valor Total" e o gráfico sempre batem.
    totalEquity: await computeEquity(userId),
    positions: portfolio.positions.map((p) => ({
      id: p.id,
      ticker: p.ticker,
      name: p.name,
      type: p.type,
      quantity: Number(p.quantity),
      avgPrice: Number(p.avgPrice),
      currentValue: Number(p.currentValue),
    })),
  };
}

const PERIOD_DAYS: Record<HistoryQuery["period"], number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Série real do patrimônio (fotografias gravadas a cada operação e uma por
// dia), não uma curva desenhada sobre o saldo atual. Contas sem histórico
// começam no primeiro registro, sem inventar passado.
export async function getHistory(
  userId: string,
  query: HistoryQuery,
  log?: Pick<FastifyBaseLogger, "warn">
) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { userId, deletedAt: null },
    select: { id: true },
  });

  if (!portfolio) {
    throw new AppError("PORTFOLIO_NOT_FOUND", "Portfólio não encontrado", 404);
  }

  const days = PERIOD_DAYS[query.period] ?? PERIOD_DAYS["30d"];
  const now = new Date();
  const currentEquity = await computeEquity(userId);
  // Gravar a fotografia do dia é acessório: se falhar, a série sai com o que
  // já existe (o último ponto é sempre o patrimônio atual).
  await ensureSnapshots(userId, currentEquity, now).catch((err) => log?.warn({ err, userId }, "fotografia diária não gravada"));

  // O 1º dia da janela precisa do último valor registrado antes dela.
  const since = new Date(now.getTime() - (days + 1) * DAY_MS);
  const [previous, inWindow] = await Promise.all([
    prisma.portfolioSnapshot.findFirst({
      where: { userId, createdAt: { lt: since } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, equity: true },
    }),
    prisma.portfolioSnapshot.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, equity: true, netFlow: true },
    }),
  ]);

  const snapshots = [
    // O fluxo desse registro já está embutido no valor inicial da janela.
    ...(previous ? [{ createdAt: previous.createdAt, equity: previous.equity.toNumber(), netFlow: 0 }] : []),
    ...inWindow.map((s) => ({ createdAt: s.createdAt, equity: s.equity.toNumber(), netFlow: s.netFlow.toNumber() })),
  ];

  // Nada gravado ainda (1º acesso concorrente com a gravação, ou falha dela):
  // o dia de hoje com o patrimônio atual, que é real, em vez de série vazia.
  const series = snapshots.length > 0 ? snapshots : [{ createdAt: now, equity: currentEquity, netFlow: 0 }];
  const history = buildDailySeries(series, days, now, currentEquity);
  // 1º dia da conta: a série diária tem 1 ponto; a evolução dentro do dia
  // (fotografias de hoje + agora) permite desenhar a linha desde já.
  const intraday = history.length < 2 ? buildIntradaySeries(snapshots, now, currentEquity) : [];
  return { history, intraday, returnPct: timeWeightedReturnPct(history) };
}

// Incrementa o balance diretamente (top-up simulado de demo, sem Transfer/Order
// associado) e grava o registro de auditoria em BalanceTopUp na mesma
// transação — precisa ser atômico porque balanceAfter é derivado do resultado
// do próprio increment; se o audit falhar, o crédito não pode ficar sem rastro.
// actorUserId vem do token de quem chamou a rota, não é assumido igual a
// userId: hoje sempre coincidem (só top-up na própria conta), mas a distinção
// já existe na tabela pra quando um ADMIN puder creditar a conta de outro.
export async function topUp(userId: string, actorUserId: string, amount: number) {
  const result = await prisma.$transaction(async (tx) => {
    const portfolio = await tx.portfolio.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!portfolio) {
      throw new AppError("PORTFOLIO_NOT_FOUND", "Portfólio não encontrado", 404);
    }

    const updated = await tx.portfolio.update({
      where: { id: portfolio.id },
      data: { balance: { increment: amount } },
    });

    await tx.balanceTopUp.create({
      data: {
        userId,
        actorUserId,
        amount,
        balanceAfter: updated.balance,
      },
    });

    return { balance: Number(updated.balance) };
  });

  await recordSnapshot(userId, "TOPUP", amount);
  return result;
}

export async function getDiversification(userId: string) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { userId, deletedAt: null },
    include: {
      positions: {
        where: { deletedAt: null },
        select: { type: true, currentValue: true },
      },
    },
  });

  if (!portfolio) {
    throw new AppError("PORTFOLIO_NOT_FOUND", "Portfólio não encontrado", 404);
  }

  const positions = portfolio.positions.map((p) => ({
    type: p.type,
    currentValue: Number(p.currentValue),
  }));

  // Moedas estrangeiras entram como uma fatia própria, em BRL (mesma cotação
  // do patrimônio no gráfico de evolução).
  const foreign = await foreignCurrencyValueInBrl(userId);
  const slices = foreign > 0 ? [...positions, { type: "FOREIGN_CURRENCY" as const, currentValue: foreign }] : positions;

  // Denominador = só o que está INVESTIDO (posições + moedas), sem o caixa:
  // a diversificação responde "de cada R$ 100 investidos, quanto está em cada
  // lugar" — as fatias somam 100%. Com o caixa no total, as fatias ficavam
  // pequenas e a soma não fechava (ex.: 13,6% numa conta com muito caixa).
  // O saldo em conta aparece no Painel ("Saldo em conta").
  const totalInvested = Math.round(slices.reduce((sum, p) => sum + p.currentValue, 0) * 100) / 100;

  return calculateDiversification(slices, totalInvested);
}
