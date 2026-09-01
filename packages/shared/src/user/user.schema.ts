// @investpro/shared
// Contratos de usuário. Espelham packages/server/src/modules/user/user.schema.ts.

import { z } from 'zod';
import { USER_ROLES } from '../types/enums.js';

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;

export const cpfSchema = z.string().regex(
  cpfRegex,
  'CPF inválido (use XXX.XXX.XXX-XX ou 11 dígitos)'
);

export const updateUserInputSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  phone: z.string().regex(/^\+?\d{10,15}$/, 'Telefone inválido').optional(),
  cpf: cpfSchema.optional(),
});

export const userMeResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  phone: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  role: z.enum(USER_ROLES),
  createdAt: z.string(),
});

export const updateUserResponseSchema = userMeResponseSchema;

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type UserMeResponse = z.infer<typeof userMeResponseSchema>;
export type UpdateUserResponse = z.infer<typeof updateUserResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;