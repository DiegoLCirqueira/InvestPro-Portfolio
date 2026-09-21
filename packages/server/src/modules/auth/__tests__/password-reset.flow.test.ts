// @investpro/server
// Teste de INTEGRAÇÃO HTTP do fluxo completo de redefinição de senha contra o
// PostgreSQL real, com o corpo certo do contrato ({ token, newPassword }):
// forgot-password -> link com token -> reset-password -> senha nova loga, a antiga
// não -> refresh tokens antigos revogados -> token não reutilizável e com expiração.
// O envio de e-mail é mockado; o link capturado é a fonte do token (nada de e-mail real).

import { randomBytes } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'

const { sentEmails } = vi.hoisted(() => ({
  sentEmails: {
    resetLinks: [] as Array<{ to: string; link: string }>,
    passwordChanged: [] as string[],
  },
}))

vi.mock('../lib/email.js', () => ({
  sendPasswordResetEmail: vi.fn(async (to: string, link: string) => {
    sentEmails.resetLinks.push({ to, link })
  }),
  sendPasswordChangedEmail: vi.fn(async (to: string) => {
    sentEmails.passwordChanged.push(to)
  }),
}))

import { env } from '../../../config/env.js'
import { prisma } from '../../../config/database.js'
import { deleteUser, startApp, stopApp, uniqueEmail, uniqueIp } from '../../../test/integration.helpers.js'

const REFRESH_COOKIE = 'investpro_refresh_token'
const randomPassword = (): string => randomBytes(18).toString('base64url')

let app: FastifyInstance | undefined
const emails: string[] = []

beforeAll(async () => {
  app = await startApp()
}, 30000)

afterAll(async () => {
  await stopApp(app)
  await Promise.all(emails.map(deleteUser))
}, 60000)

async function registerUser(prefix: string, password: string) {
  const email = uniqueEmail(prefix)
  emails.push(email)
  const res = await app!.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    remoteAddress: uniqueIp(),
    payload: { email, password, fullName: 'QA Reset Flow' },
  })
  return {
    email,
    userId: res.json().user.id as string,
    refreshCookie: res.cookies.find((c) => c.name === REFRESH_COOKIE)?.value ?? '',
  }
}

const post = (url: string, payload: Record<string, unknown>) =>
  app!.inject({ method: 'POST', url, remoteAddress: uniqueIp(), payload })

async function requestResetToken(email: string): Promise<string> {
  const res = await post('/api/v1/auth/forgot-password', { email })
  expect(res.statusCode).toBe(200)

  const sent = sentEmails.resetLinks.filter((mail) => mail.to === email).at(-1)
  expect(sent).toBeDefined()
  return new URL(sent!.link).searchParams.get('token') ?? ''
}

describe('fluxo completo: esqueci a senha -> redefinir', () => {
  it('link do e-mail aponta pra rota do frontend; reset com { token, newPassword } troca a senha, revoga sessões e o token não se reutiliza', async () => {
    const oldPassword = randomPassword()
    const newPassword = randomPassword()
    const { email, refreshCookie } = await registerUser('reset-flow', oldPassword)

    // 1) pedir o reset: 200 genérico e e-mail com o link da rota do frontend.
    const forgot = await post('/api/v1/auth/forgot-password', { email })
    expect(forgot.statusCode).toBe(200)
    const sent = sentEmails.resetLinks.find((mail) => mail.to === email)
    expect(sent?.link.startsWith(`${env.FRONTEND_URL}/reset-password?token=`)).toBe(true)
    const token = new URL(sent!.link).searchParams.get('token') ?? ''
    expect(token.length).toBeGreaterThanOrEqual(32)

    // 2) o corpo antigo do cliente ({ token, password }) é recusado: contrato é newPassword.
    const wrongBody = await post('/api/v1/auth/reset-password', { token, password: newPassword })
    expect(wrongBody.statusCode).toBe(400)
    expect(wrongBody.json().error).toBe('VALIDATION_ERROR')

    // 3) reset com o corpo certo.
    const reset = await post('/api/v1/auth/reset-password', { token, newPassword })
    expect(reset.statusCode).toBe(200)
    expect(sentEmails.passwordChanged).toContain(email)

    // 4) senha nova loga; a antiga não.
    expect((await post('/api/v1/auth/login', { email, password: newPassword })).statusCode).toBe(200)
    const oldLogin = await post('/api/v1/auth/login', { email, password: oldPassword })
    expect(oldLogin.statusCode).toBe(401)

    // 5) refresh token emitido antes do reset foi revogado.
    const refreshAfterReset = await app!.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      remoteAddress: uniqueIp(),
      cookies: { [REFRESH_COOKIE]: refreshCookie },
    })
    expect(refreshAfterReset.statusCode).toBe(401)
    expect(refreshAfterReset.json().error).toBe('INVALID_REFRESH_TOKEN')

    // 6) o token é de uso único.
    const reuse = await post('/api/v1/auth/reset-password', { token, newPassword: randomPassword() })
    expect(reuse.statusCode).toBe(400)
    expect(reuse.json().error).toBe('INVALID_RESET_TOKEN')
  }, 60000)

  it('token expirado (30 min) é recusado com INVALID_RESET_TOKEN e a senha não muda', async () => {
    const password = randomPassword()
    const { email, userId } = await registerUser('reset-flow-expiry', password)
    const token = await requestResetToken(email)
    await prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const res = await post('/api/v1/auth/reset-password', { token, newPassword: randomPassword() })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('INVALID_RESET_TOKEN')
    expect((await post('/api/v1/auth/login', { email, password })).statusCode).toBe(200)
  }, 60000)

  it('e-mail inexistente: 200 igual ao de e-mail cadastrado e nenhum e-mail é enviado (anti-enumeração)', async () => {
    const before = sentEmails.resetLinks.length

    const res = await post('/api/v1/auth/forgot-password', { email: uniqueEmail('reset-flow-ghost') })

    expect(res.statusCode).toBe(200)
    expect(sentEmails.resetLinks).toHaveLength(before)
  }, 30000)
})
