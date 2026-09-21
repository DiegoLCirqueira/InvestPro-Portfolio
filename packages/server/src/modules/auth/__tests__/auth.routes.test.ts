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
import { hashRefreshToken } from '../lib/refreshToken.js'

// Conta própria por execução (e-mail e senha aleatórios): o teste de login não
// depende do seed nem de nenhuma senha fixa no repositório.
const LOGIN_EMAIL = uniqueEmail('login')
const LOGIN_PASSWORD = randomBytes(18).toString('base64url')

let app: FastifyInstance | undefined

// A rotação é preguiçosa: um token novo só é trocado depois de REFRESH_ROTATE_AFTER_SECONDS
// (padrão 10 min). Envelhece o token pra o próximo refresh de fato rotacionar.
async function makeDueForRotation(refreshTokenValue: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(refreshTokenValue) },
    data: { createdAt: new Date(Date.now() - 11 * 60_000) },
  })
}

// Empurra a rotação do token pra fora da janela de tolerância de reuso (10 s).
async function ageRotationOf(refreshTokenValue: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(refreshTokenValue) },
    data: { revokedAt: new Date(Date.now() - 60_000) },
  })
}

beforeAll(async () => {
  app = await startApp()
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    remoteAddress: uniqueIp(),
    payload: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD, fullName: 'QA Login' },
  })
}, 30000)

afterAll(async () => {
  await deleteUser(LOGIN_EMAIL)
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

  it('normaliza email (trim + lowercase) na criação: retorna e persiste em minúsculas (WI-20)', async () => {
    const mixedCase = uniqueEmail('register-case')
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: {
        email: `  ${mixedCase.toUpperCase()}  `,
        password: 'SenhaForte123',
        fullName: 'QA Register Case',
      },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().user.email).toBe(mixedCase)

    const stored = await prisma.user.findUnique({ where: { email: mixedCase } })
    expect(stored).not.toBeNull()

    await deleteUser(mixedCase)
  }, 15000)

  it('normaliza email antes de checar duplicidade: 409 EMAIL_TAKEN mesmo com case/espaços diferentes (WI-20)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: { email: `  ${email.toUpperCase()}  `, password: 'SenhaForte123', fullName: 'QA Register' },
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
      payload: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.user.email).toBe(LOGIN_EMAIL)
    expect(body.accessToken).toBeTruthy()
  })

  it('login tolera case e espaços diferentes do email cadastrado (WI-20)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: uniqueIp(),
      payload: { email: `  ${LOGIN_EMAIL.toUpperCase()}  `, password: LOGIN_PASSWORD },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().user.email).toBe(LOGIN_EMAIL)
  })

  it('senha incorreta retorna 401 INVALID_CREDENTIALS', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: uniqueIp(),
      payload: { email: LOGIN_EMAIL, password: 'senha-errada' },
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

  it('reapresentar um refresh token já rotacionado, fora da janela, é reuso: 401 e revoga a família da sessão (WI-27)', async () => {
    const reuseEmail = uniqueEmail('refresh-reuse')
    const registerRes = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: { email: reuseEmail, password: 'SenhaForte123', fullName: 'QA Reuse' },
    })
    const firstCookie = registerRes.cookies.find((c) => c.name === 'investpro_refresh_token')
    await makeDueForRotation(firstCookie?.value ?? '')

    const rotated = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      remoteAddress: uniqueIp(),
      cookies: { investpro_refresh_token: firstCookie?.value ?? '' },
    })
    expect(rotated.statusCode).toBe(200)
    const secondCookie = rotated.cookies.find((c) => c.name === 'investpro_refresh_token')

    // Fora da janela de tolerância (10 s): sem envelhecer a rotação, a
    // reapresentação imediata seria a corrida entre abas, não replay.
    await ageRotationOf(firstCookie?.value ?? '')

    // Reapresenta o token JÁ rotacionado (firstCookie) — sinal de replay.
    const reused = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      remoteAddress: uniqueIp(),
      cookies: { investpro_refresh_token: firstCookie?.value ?? '' },
    })
    expect(reused.statusCode).toBe(401)
    expect(reused.json().error).toBe('REFRESH_TOKEN_REUSE_DETECTED')

    // A sessão inteira foi revogada: o token rotacionado válido (secondCookie)
    // também para de funcionar, mesmo nunca tendo sido reapresentado sozinho.
    const afterRevocation = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      remoteAddress: uniqueIp(),
      cookies: { investpro_refresh_token: secondCookie?.value ?? '' },
    })
    expect(afterRevocation.statusCode).toBe(401)

    await deleteUser(reuseEmail)
  }, 20000)

  it('rememberMe: true no login estende o cookie de refresh pra 30 dias', async () => {
    const rememberEmail = uniqueEmail('remember')
    await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: { email: rememberEmail, password: 'SenhaForte123', fullName: 'QA Remember' },
    })

    const loginRes = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: uniqueIp(),
      payload: { email: rememberEmail, password: 'SenhaForte123', rememberMe: true },
    })
    const cookie = loginRes.cookies.find((c) => c.name === 'investpro_refresh_token')
    expect(cookie?.maxAge).toBe(30 * 24 * 60 * 60)

    await deleteUser(rememberEmail)
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

  it('email cadastrado com case/espaços diferentes ainda encontra o usuário e cria token (WI-20, bug relatado)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      remoteAddress: uniqueIp(),
      payload: { email: `  ${email.toUpperCase()}  ` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().message).toBe(
      'Se o email existir em nossa base, você receberá as instruções em instantes.'
    )

    const user = await prisma.user.findUnique({ where: { email } })
    const tokens = await prisma.passwordResetToken.findMany({ where: { userId: user!.id } })
    expect(tokens.length).toBeGreaterThan(0)
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
  }, 30000) // 4 logins/reset com bcrypt contra o Postgres remoto: acima dos 5s padrão

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

// IPs fixos (fora da faixa de uniqueIp) porque aqui o alvo é justamente o
// contador de rate limit por IP compartilhado entre as requisições.
const REFRESH_TEST_IP = '10.201.0.1'
const LOGIN_LIMIT_TEST_IP = '10.201.0.2'

describe('rate limit de auth', () => {
  it('recarregar a página várias vezes por minuto não dá 429 no refresh (regressão: limite era 5/min e derrubava a sessão)', async () => {
    const refreshEmail = uniqueEmail('refresh-reload')
    const registerRes = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: { email: refreshEmail, password: 'SenhaForte123', fullName: 'QA Reload' },
    })
    let refreshCookie = registerRes.cookies.find((c) => c.name === 'investpro_refresh_token')?.value ?? ''

    const RELOADS = 8 // acima dos 5/min do limite antigo
    const statuses: number[] = []
    let lastResponseHeaders: Record<string, unknown> = {}
    for (let i = 0; i < RELOADS; i++) {
      const res = await app!.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        remoteAddress: REFRESH_TEST_IP,
        cookies: { investpro_refresh_token: refreshCookie },
      })
      statuses.push(res.statusCode)
      lastResponseHeaders = res.headers
      // O refresh rotaciona o token: a próxima recarga usa o cookie novo.
      refreshCookie =
        res.cookies.find((c) => c.name === 'investpro_refresh_token')?.value ?? refreshCookie
    }

    expect(statuses).toEqual(Array(RELOADS).fill(200))
    expect(lastResponseHeaders['x-ratelimit-limit']).toBe('30')
    await deleteUser(refreshEmail)
  }, 60000)

  it('login continua com limite estrito: 5 tentativas passam, a 6ª é 429 com Retry-After e corpo padronizado', async () => {
    const attempt = () =>
      app!.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        remoteAddress: LOGIN_LIMIT_TEST_IP,
        payload: { email: uniqueEmail('login-limit'), password: 'SenhaErrada123' },
      })

    const statuses: number[] = []
    for (let i = 0; i < 5; i++) statuses.push((await attempt()).statusCode)
    expect(statuses).toEqual(Array(5).fill(401))

    const limited = await attempt()
    expect(limited.statusCode).toBe(429)
    expect(limited.json().error).toBe('RATE_LIMIT_EXCEEDED')
    expect(typeof limited.json().message).toBe('string')
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0)
  }, 60000)
})

// Tolerância de reuso do refresh token (REFRESH_REUSE_GRACE_SECONDS, padrão 10 s):
// duas abas mandando o mesmo cookie quase juntas não derrubam a sessão.
describe('POST /api/v1/auth/refresh — janela de tolerância de reuso', () => {
  const REFRESH_COOKIE = 'investpro_refresh_token'
  const emails: string[] = []

  async function registerWithCookie(
    prefix: string
  ): Promise<{ cookie: string; userId: string; email: string }> {
    const email = uniqueEmail(prefix)
    emails.push(email)
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: { email, password: 'SenhaForte123', fullName: 'QA Grace' },
    })
    return {
      cookie: res.cookies.find((c) => c.name === REFRESH_COOKIE)?.value ?? '',
      userId: res.json().user.id as string,
      email,
    }
  }

  async function loginCookie(email: string): Promise<string> {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: uniqueIp(),
      payload: { email, password: 'SenhaForte123' },
    })
    return res.cookies.find((c) => c.name === REFRESH_COOKIE)?.value ?? ''
  }

  function refreshWith(cookie: string) {
    return app!.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      remoteAddress: uniqueIp(),
      cookies: { [REFRESH_COOKIE]: cookie },
    })
  }

  function logoutWith(cookie: string) {
    return app!.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      remoteAddress: uniqueIp(),
      cookies: { [REFRESH_COOKIE]: cookie },
    })
  }

  const newCookieOf = (res: { cookies: Array<{ name: string; value: string }> }) =>
    res.cookies.find((c) => c.name === REFRESH_COOKIE)?.value

  async function activeTokenCountOf(userId: string): Promise<number> {
    return prisma.refreshToken.count({ where: { userId, revokedAt: null } })
  }

  afterAll(async () => {
    await Promise.all(emails.map(deleteUser))
  }, 60000)

  it('reapresentar o token recém-rotacionado (dentro da janela): 200 só com access token, sem Set-Cookie e sem revogar nada', async () => {
    const { cookie: first, userId } = await registerWithCookie('grace-ok')
    await makeDueForRotation(first)
    const second = newCookieOf(await refreshWith(first))!

    const reused = await refreshWith(first)

    expect(reused.statusCode).toBe(200)
    expect(reused.json().accessToken).toBeTruthy()
    expect(newCookieOf(reused)).toBeUndefined() // não pode sobrescrever o cookie já trocado
    expect(await activeTokenCountOf(userId)).toBe(1) // só o sucessor; nada foi emitido nem revogado

    // O sucessor segue válido: a sessão não caiu.
    expect((await refreshWith(second)).statusCode).toBe(200)
  }, 30000)

  it('depois da janela o reuso é replay: 401 REFRESH_TOKEN_REUSE_DETECTED e a sessão inteira é revogada', async () => {
    const { cookie: first, userId } = await registerWithCookie('grace-expired')
    await makeDueForRotation(first)
    const second = newCookieOf(await refreshWith(first))!
    await ageRotationOf(first) // simula a janela já ter passado

    const reused = await refreshWith(first)

    expect(reused.statusCode).toBe(401)
    expect(reused.json().error).toBe('REFRESH_TOKEN_REUSE_DETECTED')
    expect(await activeTokenCountOf(userId)).toBe(0)
    expect((await refreshWith(second)).statusCode).toBe(401)
  }, 30000)

  it('token de logout continua 401 (INVALID_REFRESH_TOKEN), mesmo logo depois', async () => {
    const { cookie } = await registerWithCookie('grace-logout')
    await logoutWith(cookie)

    const res = await refreshWith(cookie)

    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('INVALID_REFRESH_TOKEN')
  }, 30000)

  it('token rotacionado + logout do sucessor: a família morreu, o token antigo NÃO ganha a janela', async () => {
    const { cookie: first } = await registerWithCookie('grace-logout-family')
    await makeDueForRotation(first)
    const second = newCookieOf(await refreshWith(first))!
    await logoutWith(second)

    const res = await refreshWith(first) // ainda dentro dos 10 s da rotação

    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('REFRESH_TOKEN_REUSE_DETECTED')
  }, 30000)

  it('token expirado continua 401 REFRESH_TOKEN_EXPIRED, e rotacionado+expirado não entra na janela', async () => {
    const { cookie: first, userId } = await registerWithCookie('grace-expiry')
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const expired = await refreshWith(first)
    expect(expired.statusCode).toBe(401)
    expect(expired.json().error).toBe('REFRESH_TOKEN_EXPIRED')

    // Rotacionado agora (dentro dos 10 s) mas já vencido: não vale a tolerância.
    await prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } })
    const rotatedAndExpired = await refreshWith(first)
    expect(rotatedAndExpired.statusCode).toBe(401)
    expect(rotatedAndExpired.json().error).toBe('REFRESH_TOKEN_REUSE_DETECTED')
  }, 30000)

  it('2 refresh concorrentes elegíveis à rotação com o mesmo cookie: ambos 200, só UM rotaciona (Set-Cookie) e a sessão segue viva', async () => {
    const { cookie, userId } = await registerWithCookie('grace-concurrent')
    await makeDueForRotation(cookie)

    const [a, b] = await Promise.all([refreshWith(cookie), refreshWith(cookie)])

    expect([a.statusCode, b.statusCode]).toEqual([200, 200])
    const newCookies = [newCookieOf(a), newCookieOf(b)].filter((value): value is string => Boolean(value))
    expect(newCookies).toHaveLength(1) // a perdedora da corrida não emite outro refresh token
    expect(await activeTokenCountOf(userId)).toBe(1)
    expect((await refreshWith(newCookies[0])).statusCode).toBe(200)
  }, 30000)

  it('rotação preguiçosa: N refreshes seguidos com o mesmo cookie => todos 200, sem Set-Cookie e sem rotacionar', async () => {
    const { cookie, userId } = await registerWithCookie('lazy-same-cookie')

    for (let i = 0; i < 6; i++) {
      const res = await refreshWith(cookie)
      expect(res.statusCode).toBe(200)
      expect(res.json().accessToken).toBeTruthy()
      expect(newCookieOf(res)).toBeUndefined() // o cookie do navegador fica como está
    }

    expect(await activeTokenCountOf(userId)).toBe(1)
    expect(await prisma.refreshToken.count({ where: { userId, revokedAt: { not: null } } })).toBe(0)
  }, 60000)

  it('rotação preguiçosa: 2 refresh concorrentes dentro da janela de rotação => ambos 200, nenhum rotaciona', async () => {
    const { cookie, userId } = await registerWithCookie('lazy-concurrent')

    const [a, b] = await Promise.all([refreshWith(cookie), refreshWith(cookie)])

    expect([a.statusCode, b.statusCode]).toEqual([200, 200])
    expect([newCookieOf(a), newCookieOf(b)]).toEqual([undefined, undefined])
    expect(await activeTokenCountOf(userId)).toBe(1)
  }, 30000)

  it('passado REFRESH_ROTATE_AFTER_SECONDS o refresh rotaciona: Set-Cookie novo e o token antigo fica revogado', async () => {
    const { cookie, userId } = await registerWithCookie('lazy-rotates')
    await makeDueForRotation(cookie)

    const res = await refreshWith(cookie)

    const rotated = newCookieOf(res)
    expect(res.statusCode).toBe(200)
    expect(rotated).toBeTruthy()
    expect(rotated).not.toBe(cookie)
    expect(await activeTokenCountOf(userId)).toBe(1) // só o sucessor
    const old = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(cookie) } })
    expect(old?.revokedAt).not.toBeNull()
  }, 30000)

  it('reuso real (fora da janela) revoga SÓ a família: a segunda sessão do mesmo usuário, de outro login, segue válida', async () => {
    const { cookie: sessionA, userId, email } = await registerWithCookie('family-only')
    const sessionB = await loginCookie(email) // outro login = outra família
    await makeDueForRotation(sessionA)
    const rotatedA = newCookieOf(await refreshWith(sessionA))!
    await ageRotationOf(sessionA)

    const reused = await refreshWith(sessionA)

    expect(reused.statusCode).toBe(401)
    expect(reused.json().error).toBe('REFRESH_TOKEN_REUSE_DETECTED')
    expect((await refreshWith(rotatedA)).statusCode).toBe(401) // descendente da mesma família: revogado
    const bStillValid = await refreshWith(sessionB)
    expect(bStillValid.statusCode).toBe(200) // outra sessão: intacta
    expect(await activeTokenCountOf(userId)).toBe(1) // só a do login B
  }, 60000)
})
