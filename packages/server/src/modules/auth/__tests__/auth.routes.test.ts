// @investpro/server
// Testes de INTEGRAÇÃO das rotas de autenticação contra o PostgreSQL real.
// Fluxo completo: register (201) -> login (200) -> refresh (rotação de token via
// cookie httpOnly) -> logout (200). Também cobre 401/409/validação.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { randomBytes } from 'node:crypto'
import { deleteUser, startApp, stopApp, uniqueEmail, uniqueIp } from '../../../test/integration.helpers.js'
import { prisma } from '../../../config/database.js'
import { hashResetToken } from '../lib/resetToken.js'

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

  it('rotaciona o access token sem enviar body (comportamento real do frontend)', async () => {
    const registerRes = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: { email: uniqueEmail('refresh-nobody'), password: 'SenhaForte123', fullName: 'QA Refresh' },
    })
    const cookie = registerRes.cookies.find((c) => c.name === 'investpro_refresh_token')

    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      remoteAddress: uniqueIp(),
      cookies: { investpro_refresh_token: cookie?.value ?? '' },
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

describe('POST /api/v1/auth/forgot-password', () => {
  const email = uniqueEmail('forgot')

  beforeAll(async () => {
    await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: { email, password: 'SenhaForte123', fullName: 'QA Forgot' },
    })
  })

  it('email cadastrado: 200 com mensagem genérica e cria um PasswordResetToken', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      remoteAddress: uniqueIp(),
      payload: { email },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().message).toBe(
      'Se o email existir em nossa base, você receberá as instruções em instantes.'
    )

    const user = await prisma.user.findUnique({ where: { email } })
    const tokens = await prisma.passwordResetToken.findMany({ where: { userId: user!.id } })
    expect(tokens).toHaveLength(1)
    expect(tokens[0].usedAt).toBeNull()
  })

  it('email inexistente: 200 com a MESMA mensagem genérica (não revela se o email existe)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      remoteAddress: uniqueIp(),
      payload: { email: 'nao-existe-forgot@teste.com' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().message).toBe(
      'Se o email existir em nossa base, você receberá as instruções em instantes.'
    )
  })

  it('email com formato inválido retorna 400 de validação', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      remoteAddress: uniqueIp(),
      payload: { email: 'nao-e-um-email' },
    })
    expect(res.statusCode).toBe(400)
  })

  afterAll(async () => {
    await deleteUser(email)
  })
})

describe('POST /api/v1/auth/reset-password', () => {
  const email = uniqueEmail('reset')
  let userId: string

  beforeAll(async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: { email, password: 'SenhaForte123', fullName: 'QA Reset' },
    })
    userId = res.json().user.id
  })

  async function createResetToken(overrides: { expiresAt?: Date; usedAt?: Date | null } = {}) {
    const token = randomBytes(32).toString('base64url')
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashResetToken(token),
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 30 * 60_000),
        usedAt: overrides.usedAt ?? null,
      },
    })
    return token
  }

  it('fluxo feliz: redefine a senha e invalida refresh tokens antigos', async () => {
    const loginBefore = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: uniqueIp(),
      payload: { email, password: 'SenhaForte123' },
    })
    const oldRefreshCookie = loginBefore.cookies.find((c) => c.name === 'investpro_refresh_token')

    const token = await createResetToken()
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      remoteAddress: uniqueIp(),
      payload: { token, newPassword: 'NovaSenhaForte456' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().message).toBe('Senha redefinida com sucesso')

    const loginOldPassword = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: uniqueIp(),
      payload: { email, password: 'SenhaForte123' },
    })
    expect(loginOldPassword.statusCode).toBe(401)

    const loginNewPassword = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: uniqueIp(),
      payload: { email, password: 'NovaSenhaForte456' },
    })
    expect(loginNewPassword.statusCode).toBe(200)

    const refreshAfterReset = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      remoteAddress: uniqueIp(),
      cookies: { investpro_refresh_token: oldRefreshCookie?.value ?? '' },
      payload: {},
    })
    expect(refreshAfterReset.statusCode).toBe(401)
    expect(refreshAfterReset.json().error).toBe('INVALID_REFRESH_TOKEN')
  })

  it('token expirado retorna 400 INVALID_RESET_TOKEN (mensagem genérica)', async () => {
    const token = await createResetToken({ expiresAt: new Date(Date.now() - 1000) })
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      remoteAddress: uniqueIp(),
      payload: { token, newPassword: 'OutraSenha789' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('INVALID_RESET_TOKEN')
  })

  it('token reutilizado (já usado) retorna 400 INVALID_RESET_TOKEN', async () => {
    const token = await createResetToken()

    const first = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      remoteAddress: uniqueIp(),
      payload: { token, newPassword: 'PrimeiraTroca123' },
    })
    expect(first.statusCode).toBe(200)

    const second = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      remoteAddress: uniqueIp(),
      payload: { token, newPassword: 'SegundaTroca456' },
    })
    expect(second.statusCode).toBe(400)
    expect(second.json().error).toBe('INVALID_RESET_TOKEN')
  })

  it('token inexistente retorna 400 INVALID_RESET_TOKEN (mesma mensagem genérica)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      remoteAddress: uniqueIp(),
      payload: { token: 'token-que-nunca-existiu', newPassword: 'QualquerSenha123' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('INVALID_RESET_TOKEN')
  })

  afterAll(async () => {
    await deleteUser(email)
  })
})
