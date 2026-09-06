import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_EXPIRY = '15m'

export interface TokenPayload {
  sub?: string
  jti?: string
}

export function signAccessToken(userId: string, secret: string): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

export function verifyToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload
}