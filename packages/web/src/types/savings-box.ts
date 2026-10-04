export interface SavingsBoxResponse {
  balance: number;
  rate: number;
  // Não é exibido: o servidor aplica a taxa sobre o saldo de hoje desde a abertura da Caixinha,
  // então um depósito novo já "rende" retroativo. Volta quando for calculado por movimentação.
  estimatedYield: number;
}

// GET /savings-box/transactions (extrato): mais recentes primeiro, paginado por cursor. Só existe
// a partir da publicação do extrato (sem histórico anterior). ORDER_FUNDING = resgate automático
// para completar uma compra (orderId aponta a ordem).
export type SavingsBoxTransactionType = "DEPOSIT" | "WITHDRAW" | "ORDER_FUNDING";

export interface SavingsBoxTransaction {
  id: string;
  type: SavingsBoxTransactionType;
  amount: number;
  balanceAfter: number;
  createdAt: string;
  orderId: string | null;
}

export interface SavingsBoxTransactionPage {
  items: SavingsBoxTransaction[];
  nextCursor: string | null;
}
