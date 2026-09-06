// @investpro/server
// Refresh token opaco (WI-27): mesmo padrão de resetToken.ts — gera um valor
// aleatório que só existe no cookie do cliente, e persiste SÓ o hash SHA-256
// no banco. Diferente de resetToken.ts, a duração varia com "lembrar de mim".

import { randomBytes, randomUUID, createHash } from 'node:crypto'

export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60
export const REFRESH_TOKEN_TTL_SECONDS_REMEMBER_ME = 30 * 24 * 60 * 60

export interface GeneratedRefreshToken {
  token: string
  tokenHash: string
  expiresAt: Date
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateRefreshToken(rememberMe: boolean): GeneratedRefreshToken {
  const token = randomBytes(32).toString('base64url')
  const ttlSeconds = rememberMe ? REFRESH_TOKEN_TTL_SECONDS_REMEMBER_ME : REFRESH_TOKEN_TTL_SECONDS
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

  return { token, tokenHash: hashRefreshToken(token), expiresAt }
}

/** Novo id de família (uma cadeia de rotação), gerado a cada login/register. */
export function newRefreshTokenFamilyId(): string {
  return randomUUID()
}
