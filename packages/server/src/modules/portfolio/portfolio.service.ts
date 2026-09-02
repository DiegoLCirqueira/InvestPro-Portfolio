import { prisma } from "../../config/database.js";
import { AppError } from "../auth/auth.service.js";
import type { HistoryQuery } from "./portfolio.schema.js";
import { calculateDiversification } from "./portfolio.domain.js";

export async function getPortfolio(userId: string) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { userId },
    include: {
      positions: {
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

export async function getHistory(userId: string, query: HistoryQuery) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { userId },
    select: { balance: true, positions: { select: { currentValue: true } } },
  });

  if (!portfolio) {
    throw new AppError("PORTFOLIO_NOT_FOUND", "Portfólio não encontrado", 404);
  }

  const periodDays: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };

  const days = periodDays[query.period] ?? 30;
  const now = new Date();
  // Patrimônio total (caixa + posições): usar só o caixa faria o histórico
  // "cair" a cada compra, já que a ordem FILLED move valor do balance para
  // a Position sem alterar o patrimônio de fato (ver WI-12/WI-14).
  const positionsTotal = portfolio.positions.reduce((sum, p) => sum + Number(p.currentValue), 0);
  const totalEquity = Number(portfolio.balance) + positionsTotal;

  const history: Array<{ date: string; balance: number }> = [];
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const factor = 1 + (Math.sin(i * 0.3) * 0.02) + ((days - i) / days) * 0.05;
    history.push({
      date: date.toISOString().split("T")[0],
      balance: Math.round(totalEquity * factor * 100) / 100,
    });
  }

  return { history };
}

export async function getDiversification(userId: string) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { userId },
    include: {
      positions: {
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

  // Patrimônio total (caixa + posições), não só o caixa: uma ordem FILLED
  // decrementa/incrementa balance ao mover valor para/de uma Position, então
  // usar só o balance como denominador distorceria os percentuais (WI-14).
  const positionsTotal = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalEquity = Number(portfolio.balance) + positionsTotal;

  return calculateDiversification(positions, totalEquity);
}
