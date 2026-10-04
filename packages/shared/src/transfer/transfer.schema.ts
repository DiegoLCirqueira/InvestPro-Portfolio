// @investpro/shared
// Contratos de transferências bancárias. Base para WI-212.

import { z } from 'zod';
import { TRANSFER_STATUSES, TRANSFER_TYPES } from '../types/enums.js';
import { moneyAmountSchema } from '../types/money.js';
import { PIX_KEY_TYPES } from './pix-key.js';

export const bankAccountSchema = z.object({
  id: z.string(),
  bank: z.string(),
  agency: z.string(),
  // Opcional no shape: PIX não exige número da conta (só a chave/agência).
  // A TED exige (refine de createTransferInputSchema).
  account: z.string().optional(),
  holderName: z.string().optional(),
  type: z.enum(TRANSFER_TYPES).optional(),
});

// Na criação o id é opcional: conta avulsa digitada na tela não tem id, e o
// servidor sintetiza um (transfer.domain.ts > formatToAccount).
export const bankAccountInputSchema = bankAccountSchema.extend({
  id: z.string().optional(),
});

export const DOC_DISCONTINUED_MESSAGE = 'O DOC foi extinto em 2024. Use PIX ou TED.';
export const TED_REQUIRES_ACCOUNT_MESSAGE = 'TED exige a conta de destino: banco, agência e conta';

// TED sem conta debitaria valor + tarifa sem destinatário.
function hasFullAccount(account: z.infer<typeof bankAccountInputSchema> | undefined): boolean {
  return Boolean(account?.bank.trim() && account.agency.trim() && account.account?.trim());
}

export const createTransferInputSchema = z
  .object({
    type: z.enum(TRANSFER_TYPES),
    toAccount: bankAccountInputSchema.optional(),
    amount: moneyAmountSchema,
    description: z.string().max(140).optional(),
    // Chave PIX (CPF/CNPJ/e-mail/celular/chave aleatória). Obrigatória e validada
    // quando type === 'PIX' (transfer.domain.ts > validateTransfer); ignorada nos demais.
    pixKey: z.string().optional(),
    // Tipo da chave: obrigatório só quando os dígitos servem pra mais de um tipo
    // (CPF que também tem formato de celular). A tela sempre envia.
    pixKeyType: z.enum(PIX_KEY_TYPES).optional(),
  })
  // DOC segue no enum só pelo histórico: as antigas continuam listadas, mas
  // nenhuma nova é aceita.
  .refine((data) => data.type !== 'DOC', { message: DOC_DISCONTINUED_MESSAGE, path: ['type'] })
  .refine((data) => data.type !== 'TED' || hasFullAccount(data.toAccount), {
    message: TED_REQUIRES_ACCOUNT_MESSAGE,
    path: ['toAccount'],
  });

export const transferSchema = z.object({
  id: z.string(),
  status: z.enum(TRANSFER_STATUSES),
  type: z.enum(TRANSFER_TYPES),
  amount: z.number().positive(),
  description: z.string().nullable().optional(),
  toAccount: bankAccountSchema.optional(),
  pixKey: z.string().nullable().optional(),
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
export type BankAccountInput = z.infer<typeof bankAccountInputSchema>;
export type CreateTransferInput = z.infer<typeof createTransferInputSchema>;
export type Transfer = z.infer<typeof transferSchema>;
export type TransferList = z.infer<typeof transferListSchema>;