import { randomBytes, createHash } from 'node:crypto'

export const RESET_TOKEN_EXPIRY_MINUTES = 30

export interface GeneratedResetToken {
  token: string
  tokenHash: string
  expiresAt: Date
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generatePasswordResetToken(): GeneratedResetToken {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60_000)

  return { token, tokenHash: hashResetToken(token), expiresAt }
}
