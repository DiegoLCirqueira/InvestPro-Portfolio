import type { TransferType } from "@/types/transfer";

// Espelha TRANSFER_FEES de packages/server/src/modules/transfer/transfer.domain.ts: a tarifa
// sai do saldo junto com o valor, então entra no quanto falta de um "saldo insuficiente".
const TRANSFER_FEES: Record<TransferType, number> = { PIX: 0, TED: 10, DOC: 5 };

/** Quanto a transferência tira do saldo em conta: valor + tarifa. */
export function transferCost(type: TransferType, amount: number): number {
  return amount + TRANSFER_FEES[type];
}
