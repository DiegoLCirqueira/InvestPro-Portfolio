// @investpro/server
// Service da caixinha: depósito/resgate movem dinheiro entre Portfolio.balance
// e SavingsBox.balance, sempre atomicamente e nunca deixando nenhum dos dois
// negativo. Mesmo padrão de order/transfer: transação Serializable com retry
// (runSerializableTx) porque cada operação lê um saldo e decide se escreve
// com base nele.

import type { Prisma } from "@prisma/client";
import type { SavingsBoxResponse } from "@investpro/shared";
import { prisma } from "../../config/database.js";
import { AppError } from "../auth/auth.service.js";
import { runSerializableTx } from "../../shared/db/serializableTransaction.js";
import { estimateSimpleYield, SAVINGS_BOX_ANNUAL_RATE } from "./savings-box.domain.js";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function daysSince(date: Date): number {
  return Math.max(0, (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function toResponse(balance: number, createdAt: Date | null): SavingsBoxResponse {
  const estimatedYield = createdAt
    ? round2(estimateSimpleYield(balance, daysSince(createdAt)))
    : 0;
  return { balance, rate: SAVINGS_BOX_ANNUAL_RATE, estimatedYield };
}

export async function getSavingsBox(userId: string): Promise<SavingsBoxResponse> {
  const box = await prisma.savingsBox.findUnique({ where: { userId, deletedAt: null } });
  return toResponse(box ? Number(box.balance) : 0, box?.createdAt ?? null);
}

async function executeDeposit(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number
): Promise<{ balance: number; createdAt: Date }> {
  const portfolio = await tx.portfolio.findUnique({ where: { userId } });
  if (!portfolio) {
    throw new AppError("PORTFOLIO_NOT_FOUND", "Portfólio não encontrado", 404);
  }
  if (portfolio.balance.toNumber() < amount) {
    throw new AppError(
      "PORTFOLIO_INSUFFICIENT_BALANCE",
      "Saldo insuficiente no portfólio para este depósito",
      400
    );
  }

  await tx.portfolio.update({
    where: { id: portfolio.id },
    data: { balance: { decrement: amount } },
  });

  const box = await tx.savingsBox.upsert({
    where: { userId },
    create: { userId, balance: amount },
    update: { balance: { increment: amount } },
  });

  return { balance: box.balance.toNumber(), createdAt: box.createdAt };
}

async function executeWithdraw(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number
): Promise<{ balance: number; createdAt: Date }> {
  const box = await tx.savingsBox.findUnique({ where: { userId } });
  if (!box || box.balance.toNumber() < amount) {
    throw new AppError(
      "SAVINGS_BOX_INSUFFICIENT_BALANCE",
      "Saldo insuficiente na caixinha para este resgate",
      400
    );
  }

  const updated = await tx.savingsBox.update({
    where: { id: box.id },
    data: { balance: { decrement: amount } },
  });

  await tx.portfolio.update({
    where: { userId },
    data: { balance: { increment: amount } },
  });

  return { balance: updated.balance.toNumber(), createdAt: updated.createdAt };
}

export async function deposit(userId: string, amount: number): Promise<SavingsBoxResponse> {
  const result = await runSerializableTx(
    (tx) => executeDeposit(tx, userId, amount),
    "SAVINGS_BOX_EXECUTION_CONFLICT",
    "Conflito ao executar o depósito, tente novamente"
  );
  return toResponse(result.balance, result.createdAt);
}

export async function withdraw(userId: string, amount: number): Promise<SavingsBoxResponse> {
  const result = await runSerializableTx(
    (tx) => executeWithdraw(tx, userId, amount),
    "SAVINGS_BOX_EXECUTION_CONFLICT",
    "Conflito ao executar o resgate, tente novamente"
  );
  return toResponse(result.balance, result.createdAt);
}
