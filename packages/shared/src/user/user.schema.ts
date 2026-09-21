// @investpro/shared
// Contratos de usuário. Espelham packages/server/src/modules/user/user.schema.ts.

import { z } from 'zod';
import { USER_ROLES } from '../types/enums.js';
import { isValidCpf, normalizeCpf } from './cpf.js';

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;

export const cpfSchema = z.string().regex(
  cpfRegex,
  'CPF inválido (use XXX.XXX.XXX-XX ou 11 dígitos)'
);

// CPF definido pelo perfil: formato + dígitos verificadores, entregue já
// normalizado (11 dígitos). O cadastro segue com o cpfSchema só de formato.
export const cpfInputSchema = cpfSchema
  .refine((value) => isValidCpf(normalizeCpf(value)), 'CPF inválido')
  .transform(normalizeCpf);

// Definir o CPF (identidade financeira) exige reconfirmar a senha atual no mesmo
// pedido: um access token roubado sozinho não basta pra fixar o CPF da conta.
export const CPF_REQUIRES_PASSWORD_MESSAGE = 'Informe a senha atual para definir o CPF';

export function hasPasswordWhenSettingCpf(data: { cpf?: string; currentPassword?: string }): boolean {
  return data.cpf === undefined || Boolean(data.currentPassword);
}

export const updateUserInputSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  phone: z.string().regex(/^\+?\d{10,15}$/, 'Telefone inválido').optional(),
  cpf: cpfInputSchema.optional(),
  currentPassword: z.string().min(1).optional(),
}).refine(hasPasswordWhenSettingCpf, {
  message: CPF_REQUIRES_PASSWORD_MESSAGE,
  path: ['currentPassword'],
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