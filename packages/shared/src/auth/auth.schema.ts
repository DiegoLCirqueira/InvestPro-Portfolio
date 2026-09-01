// @investpro/shared
// Contratos de autenticação. Espelham packages/server/src/modules/auth/auth.schema.ts
// e são a versão canônica consumida pela Fase C.

import { z } from 'zod';
import { cpfSchema } from '../user/user.schema.js';

export const registerInputSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  cpf: cpfSchema.optional(),
});

export const loginInputSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

/** Usuário compacto retornado em respostas de auth. */
export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
});

export const authResponseSchema = z.object({
  user: authUserSchema,
  accessToken: z.string(),
});

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
});

export const logoutResponseSchema = z.object({
  message: z.string(),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;