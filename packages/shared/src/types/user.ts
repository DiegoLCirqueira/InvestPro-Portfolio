// @investpro/shared
// Tipos relacionados a usuários.

import { USER_ROLES } from './enums.js';

/** Papéis de usuário do sistema. */
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Usuário autenticado/representado no domínio.
 * Espelha o `userMeResponseSchema` de packages/server (inclui createdAt).
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  cpf?: string | null;
  phone?: string | null;
  createdAt: string;
}