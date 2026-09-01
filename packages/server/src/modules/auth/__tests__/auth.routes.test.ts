// @investpro/server
// Testes de INTEGRAÇÃO das rotas de autenticação contra o PostgreSQL real.
// Fluxo completo: register (201) -> login (200) -> refresh (rotação de token via
// cookie httpOnly) -> logout (200). Também cobre 401/409/validação.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { deleteUser, startApp, stopApp, uniqueEmail, uniqueIp } from '../../../test/integration.helpers.js'

const SEED_EMAIL = 'diego@investpro.com'
const SEED_PASSWORD = '123456'

let app: FastifyInstance | undefined

beforeAll(async () => {
  app = await startApp()
})

afterAll(async () => {
  await stopApp(app)
})

describe('POST /api/v1/auth/register', () => {
  const email = uniqueEmail('register')

  it('cria usuário e devolve 201 com user + accessToken + cookie de refresh', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: { email, password: 'SenhaForte123', fullName: 'QA Register' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.user.email).toBe(email)
    expect(body.user.fullName).toBe('QA Register')
    expect(body.accessToken).toBeTruthy()
    expect(body.user).not.toHaveProperty('passwordHash')

    const refreshCookie = res.cookies.find((c) => c.name === 'investpro_refresh_token')
    expect(refreshCookie).toBeDefined()
    expect(refreshCookie?.httpOnly).toBe(true)
    expect(refreshCookie?.sameSite?.toLowerCase()).toBe('lax')
  })

  it('retorna 409 EMAIL_TAKEN para email duplicado', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: { email, password: 'SenhaForte123', fullName: 'QA Register' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('EMAIL_TAKEN')
  })

  afterAll(async () => {
    await deleteUser(email)
  })
})

describe('POST /api/v1/auth/login', () => {
  it('login com credenciais do seed retorna 200 e access token', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: uniqueIp(),
      payload: { email: SEED_EMAIL, password: SEED_PASSWORD },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.user.email).toBe(SEED_EMAIL)
    expect(body.accessToken).toBeTruthy()
  })

  it('senha incorreta retorna 401 INVALID_CREDENTIALS', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: uniqueIp(),
      payload: { email: SEED_EMAIL, password: 'senha-errada' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('INVALID_CREDENTIALS')
  })

  it('email inexistente retorna 401 (sem revelar se o usuário existe)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: uniqueIp(),
      payload: { email: 'nao-existe@teste.com', password: 'qualquer1' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('INVALID_CREDENTIALS')
  })
})

describe('POST /api/v1/auth/refresh', () => {
  const email = uniqueEmail('refresh')

  it('rotaciona o access token a partir do cookie httpOnly (200)', async () => {
    const registerRes = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: { email, password: 'SenhaForte123', fullName: 'QA Refresh' },
    })
    const cookie = registerRes.cookies.find((c) => c.name === 'investpro_refresh_token')

    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      remoteAddress: uniqueIp(),
      cookies: { investpro_refresh_token: cookie?.value ?? '' },
      payload: {},
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().accessToken).toBeTruthy()
  })

  it('sem cookie retorna 401 MISSING_REFRESH_TOKEN', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      remoteAddress: uniqueIp(),
      payload: {},
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('MISSING_REFRESH_TOKEN')
  })

  afterAll(async () => {
    await deleteUser(email)
  })
})

describe('POST /api/v1/auth/logout', () => {
  const email = uniqueEmail('logout')

  it('encerra a sessão (200) mesmo sem cookie', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      remoteAddress: uniqueIp(),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().message).toContain('Sessão encerrada')
  })

  it('logout com cookie válido invalida o refresh token no DB', async () => {
    const registerRes = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: { email, password: 'SenhaForte123', fullName: 'QA Logout' },
    })
    const cookie = registerRes.cookies.find((c) => c.name === 'investpro_refresh_token')

    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      remoteAddress: uniqueIp(),
      cookies: { investpro_refresh_token: cookie?.value ?? '' },
    })
    expect(res.statusCode).toBe(200)

    const refreshRes = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      remoteAddress: uniqueIp(),
      cookies: { investpro_refresh_token: cookie?.value ?? '' },
      payload: {},
    })
    expect(refreshRes.statusCode).toBe(401)
    expect(refreshRes.json().error).toBe('INVALID_REFRESH_TOKEN')
  })

  afterAll(async () => {
    await deleteUser(email)
  })
})
