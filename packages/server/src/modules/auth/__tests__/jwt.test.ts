import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { signAccessToken, verifyToken } from '../lib/jwt.js'

const ACCESS_SECRET = 'test-access-secret'
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

// Refresh tokens não são mais JWT (WI-27: token opaco + hash em repouso, ver
// lib/refreshToken.ts, coberto via auth.service.test.ts) — os testes acima
// cobrem só o access token, que continua JWT.