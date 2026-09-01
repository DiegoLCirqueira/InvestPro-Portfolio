// @investpro/shared
// Contratos de transferências bancárias. Base para WI-212.

import { z } from 'zod';
import { TRANSFER_STATUSES, TRANSFER_TYPES } from '../types/enums.js';

export const bankAccountSchema = z.object({
  id: z.string(),
  bank: z.string(),
  agency: z.string(),
  account: z.string(),
  holderName: z.string().optional(),
  type: z.enum(TRANSFER_TYPES).optional(),
});

export const createTransferInputSchema = z.object({
  type: z.enum(TRANSFER_TYPES),
  toAccount: bankAccountSchema.optional(),
  amount: z.number().positive(),
  description: z.string().max(140).optional(),
});

export const transferSchema = z.object({
  id: z.string(),
  status: z.enum(TRANSFER_STATUSES),
  type: z.enum(TRANSFER_TYPES),
  amount: z.number().positive(),
  description: z.string().nullable().optional(),
  toAccount: bankAccountSchema.optional(),
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),
  failureReason: z.string().optional(),
});

export const transferListSchema = z.object({
  items: z.array(transferSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type BankAccount = z.infer<typeof bankAccountSchema>;
export type CreateTransferInput = z.infer<typeof createTransferInputSchema>;
export type Transfer = z.infer<typeof transferSchema>;
export type TransferList = z.infer<typeof transferListSchema>;