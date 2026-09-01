import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  REFRESH_TOKEN_EXPIRY_DAYS,
} from '../lib/jwt.js'

const ACCESS_SECRET = 'test-access-secret'
const REFRESH_SECRET = 'test-refresh-secret'
const USER_ID = '0a0a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a'

describe('signAccessToken / verifyToken', () => {
  it('gera um token verificável com o sub do usuário', () => {
    const token = signAccessToken(USER_ID, ACCESS_SECRET)
    const payload = verifyToken(token, ACCESS_SECRET)
    expect(payload.sub).toBe(USER_ID)
  })

  it('expira em aproximadamente 15 minutos', () => {
    const token = signAccessToken(USER_ID, ACCESS_SECRET)
    const decoded = jwt.decode(token) as { exp: number }
    const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000)
    expect(ttlSeconds).toBeGreaterThan(14 * 60)
    expect(ttlSeconds).toBeLessThanOrEqual(15 * 60 + 10)
  })

  it('rejeita um token adulterado', () => {
    const token = signAccessToken(USER_ID, ACCESS_SECRET)
    const [header, payload] = token.split('.')
    const tampered = `${header}.${payload}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
    expect(() => verifyToken(tampered, ACCESS_SECRET)).toThrow()
  })

  it('rejeita token assinado com segredo diferente', () => {
    const token = signAccessToken(USER_ID, ACCESS_SECRET)
    expect(() => verifyToken(token, 'outro-segredo')).toThrow()
  })

  it('rejeita token já expirado', () => {
    const expired = jwt.sign({ sub: USER_ID }, ACCESS_SECRET, { expiresIn: -100 })
    expect(() => verifyToken(expired, ACCESS_SECRET)).toThrow('jwt expired')
  })
})

describe('signRefreshToken', () => {
  it('gera token com sub e jti válidos e expiração de 7 dias', () => {
    const { token, expiresAt } = signRefreshToken(USER_ID, REFRESH_SECRET)
    const payload = verifyToken(token, REFRESH_SECRET)
    expect(payload.sub).toBe(USER_ID)
    expect(payload.jti).toBeDefined()

    const decoded = jwt.decode(token) as { exp: number }
    const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000)
    expect(ttlSeconds).toBeGreaterThan(7 * 24 * 60 * 60 - 60)
    expect(ttlSeconds).toBeLessThanOrEqual(7 * 24 * 60 * 60)

    const msUntilExpiry = expiresAt.getTime() - Date.now()
    expect(msUntilExpiry).toBeGreaterThan(6 * 24 * 60 * 60 * 1000)
    expect(msUntilExpiry).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000)
  })

  it('gera jtis únicos para cada token', () => {
    const first = signRefreshToken(USER_ID, REFRESH_SECRET)
    const second = signRefreshToken(USER_ID, REFRESH_SECRET)
    const firstPayload = verifyToken(first.token, REFRESH_SECRET)
    const secondPayload = verifyToken(second.token, REFRESH_SECRET)
    expect(firstPayload.jti).toBeDefined()
    expect(secondPayload.jti).toBeDefined()
    expect(firstPayload.jti).not.toBe(secondPayload.jti)
  })

  it('rejeita token expirado com segredo de refresh', () => {
    const expired = jwt.sign({ sub: USER_ID }, REFRESH_SECRET, { expiresIn: -100 })
    expect(() => verifyToken(expired, REFRESH_SECRET)).toThrow('jwt expired')
  })
})

describe('REFRESH_TOKEN_EXPIRY_DAYS', () => {
  it('é de 7 dias conforme especificação', () => {
    expect(REFRESH_TOKEN_EXPIRY_DAYS).toBe(7)
  })
})