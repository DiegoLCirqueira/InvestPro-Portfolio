// @investpro/server
// Helper genérico pra escritas financeiras que leem um saldo e decidem se
// escrevem com base nele (depósito/resgate/câmbio) — mesmo padrão já repetido
// em order.service.ts e transfer.service.ts: transação Serializable + retry
// em conflito de serialização (P2034), erro de negócio dedicado ao esgotar
// as tentativas.

import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { AppError } from "../../modules/auth/auth.service.js";

const MAX_TX_ATTEMPTS = 3;

export async function runSerializableTx<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  conflictErrorCode: string,
  conflictMessage: string
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (err) {
      const isSerializationConflict =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
      if (isSerializationConflict && attempt < MAX_TX_ATTEMPTS) continue;
      if (isSerializationConflict) {
        throw new AppError(conflictErrorCode, conflictMessage, 409);
      }
      throw err;
    }
  }
  // Inalcançável: o loop sempre retorna ou lança dentro das MAX_TX_ATTEMPTS iterações.
  throw new AppError(conflictErrorCode, conflictMessage, 409);
}
