// @investpro/server
// Service da caixinha: depósito/resgate movem dinheiro entre Portfolio.balance
// e SavingsBox.balance, sempre atomicamente e nunca deixando nenhum dos dois
// negativo. Mesmo padrão de order/transfer: transação Serializable com retry
// (runSerializableTx) porque cada operação lê um saldo e decide se escreve
// com base nele.

import type { Prisma } from "@prisma/client";
import type { SavingsBoxResponse, SavingsBoxTransactionList } from "@investpro/shared";
import { prisma } from "../../config/database.js";
import { AppError } from "../auth/auth.service.js";
import { runSerializableTx } from "../../shared/db/serializableTransaction.js";
import { recordSnapshot } from "../portfolio/snapshot.service.js";
import { assertFreeBalance } from "../order/order.reservation.js";
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
  await assertFreeBalance(tx, userId, portfolio.balance.toNumber(), amount, {
    code: "PORTFOLIO_INSUFFICIENT_BALANCE",
    message: "Saldo insuficiente no portfólio para este depósito",
  });

  await tx.portfolio.update({
    where: { id: portfolio.id },
    data: { balance: { decrement: amount } },
  });

  const box = await tx.savingsBox.upsert({
    where: { userId },
    create: { userId, balance: amount },
    update: { balance: { increment: amount } },
  });

  await tx.savingsBoxTransaction.create({
    data: { userId, type: "DEPOSIT", amount, balanceAfter: box.balance },
  });

  return { balance: box.balance.toNumber(), createdAt: box.createdAt };
}

// Exportada pra compra de ativo com a Caixinha (order.service) resgatar na mesma
// transação da ordem, com a mesma regra e o mesmo erro de saldo insuficiente.
// Com fundingOrderId, o extrato registra ORDER_FUNDING ligado à compra.
export async function executeWithdraw(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  fundingOrderId?: string
): Promise<{ balance: number; createdAt: Date }> {
  const box = await tx.savingsBox.findUnique({ where: { userId } });
  if (!box || box.balance.toNumber() < amount) {
    throw new AppError(
      "SAVINGS_BOX_INSUFFICIENT_BALANCE",
      "Saldo insuficiente na Caixinha para este resgate",
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

  await tx.savingsBoxTransaction.create({
    data: {
      userId,
      type: fundingOrderId ? "ORDER_FUNDING" : "WITHDRAW",
      amount,
      balanceAfter: updated.balance,
      orderId: fundingOrderId ?? null,
    },
  });

  return { balance: updated.balance.toNumber(), createdAt: updated.createdAt };
}

export async function deposit(userId: string, amount: number): Promise<SavingsBoxResponse> {
  const result = await runSerializableTx(
    (tx) => executeDeposit(tx, userId, amount),
    "SAVINGS_BOX_EXECUTION_CONFLICT",
    "Conflito ao executar o depósito, tente novamente"
  );
  await recordSnapshot(userId, "SAVINGS");
  return toResponse(result.balance, result.createdAt);
}

export async function withdraw(userId: string, amount: number): Promise<SavingsBoxResponse> {
  const result = await runSerializableTx(
    (tx) => executeWithdraw(tx, userId, amount),
    "SAVINGS_BOX_EXECUTION_CONFLICT",
    "Conflito ao executar o resgate, tente novamente"
  );
  await recordSnapshot(userId, "SAVINGS");
  return toResponse(result.balance, result.createdAt);
}

// Cursor opaco = posição (createdAt, id) do último item da página: ordem
// estável mesmo com dois movimentos no mesmo milissegundo, sem reler a linha.
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const [iso, id] = Buffer.from(cursor, "base64url").toString().split("|");
  const createdAt = new Date(iso ?? "");
  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new AppError("VALIDATION_ERROR", "Cursor inválido", 400);
  }
  return { createdAt, id };
}

export async function listTransactions(
  userId: string,
  limit: number,
  cursor?: string
): Promise<SavingsBoxTransactionList> {
  const after = cursor ? decodeCursor(cursor) : null;
  const records = await prisma.savingsBoxTransaction.findMany({
    where: {
      userId,
      ...(after && {
        OR: [
          { createdAt: { lt: after.createdAt } },
          { createdAt: after.createdAt, id: { lt: after.id } },
        ],
      }),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1, // um a mais só pra saber se existe próxima página
  });

  const page = records.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount.toNumber(),
      balanceAfter: t.balanceAfter.toNumber(),
      createdAt: t.createdAt.toISOString(),
      orderId: t.orderId,
    })),
    nextCursor: records.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}
