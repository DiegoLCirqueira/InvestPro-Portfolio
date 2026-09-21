import jwt from 'jsonwebtoken'
import { ACCESS_TOKEN_TTL_SECONDS } from '../../../config/tokenLifetimes.js'

export interface TokenPayload {
  sub?: string
  jti?: string
}

export function signAccessToken(userId: string, secret: string): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn: ACCESS_TOKEN_TTL_SECONDS })
}

export function verifyToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload
}