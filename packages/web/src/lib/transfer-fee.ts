import type { NewTransferType } from "@/types/transfer";

// Espelha TRANSFER_FEES de packages/server/src/modules/transfer/transfer.domain.ts: a tarifa
// sai do saldo junto com o valor (aparece no resumo antes de enviar e no "saldo insuficiente").
const TRANSFER_FEES: Record<NewTransferType, number> = { PIX: 0, TED: 10 };

export function transferFee(type: NewTransferType): number {
  return TRANSFER_FEES[type];
}

/** Quanto a transferência tira do saldo em conta: valor + tarifa. */
export function transferCost(type: NewTransferType, amount: number): number {
  return amount + transferFee(type);
}
