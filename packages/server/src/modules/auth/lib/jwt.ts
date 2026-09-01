import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_EXPIRY = '15m'
export const REFRESH_TOKEN_EXPIRY_DAYS = 7

export interface TokenPayload {
  sub?: string
  jti?: string
}

export function signAccessToken(userId: string, secret: string): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

export function signRefreshToken(
  userId: string,
  secret: string,
): { token: string; expiresAt: Date } {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)

  const payload = { sub: userId, jti: randomUUID() }
  const token = jwt.sign(payload, secret, {
    expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
  })

  return { token, expiresAt }
}

export function verifyToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload
}