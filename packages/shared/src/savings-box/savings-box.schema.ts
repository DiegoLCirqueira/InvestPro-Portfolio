// @investpro/shared
// Contratos da caixinha (rendimento fixo simulado, demo): saldo separado do
// Portfolio.balance, com depósito/resgate. rate/estimatedYield são
// informativos (juros simples sobre o tempo desde o depósito), não alteram o
// balance de fato — não há job de accrual real.

import { z } from 'zod';
import { moneyAmountSchema } from '../types/money.js';

export const savingsBoxAmountInputSchema = z.object({
  amount: moneyAmountSchema,
});

export const savingsBoxResponseSchema = z.object({
  balance: z.number(),
  rate: z.number(),
  estimatedYield: z.number(),
});

// Extrato: ORDER_FUNDING é o resgate automático que cobriu uma compra
// (useSavingsBox), com orderId; nos outros tipos orderId é null.
export const SAVINGS_BOX_TRANSACTION_TYPES = ['DEPOSIT', 'WITHDRAW', 'ORDER_FUNDING'] as const;

export const savingsBoxTransactionSchema = z.object({
  id: z.string(),
  type: z.enum(SAVINGS_BOX_TRANSACTION_TYPES),
  amount: z.number().positive(),
  balanceAfter: z.number().nonnegative(),
  createdAt: z.string(),
  orderId: z.string().nullable(),
});

// Mais recentes primeiro; nextCursor null quando não há mais páginas.
export const savingsBoxTransactionListSchema = z.object({
  items: z.array(savingsBoxTransactionSchema),
  nextCursor: z.string().nullable(),
});

export const savingsBoxTransactionsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
  cursor: z.string().min(1).optional(),
});

export type SavingsBoxAmountInput = z.infer<typeof savingsBoxAmountInputSchema>;
export type SavingsBoxTransaction = z.infer<typeof savingsBoxTransactionSchema>;
export type SavingsBoxTransactionList = z.infer<typeof savingsBoxTransactionListSchema>;
export type SavingsBoxResponse = z.infer<typeof savingsBoxResponseSchema>;
