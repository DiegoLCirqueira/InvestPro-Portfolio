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

export type SavingsBoxAmountInput = z.infer<typeof savingsBoxAmountInputSchema>;
export type SavingsBoxResponse = z.infer<typeof savingsBoxResponseSchema>;
