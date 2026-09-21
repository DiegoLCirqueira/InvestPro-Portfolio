// @investpro/server
// Testes de INTEGRAÇÃO de POST /api/v1/auth/register com dados já usados, contra o
// PostgreSQL real. CPF duplicado tem que dar 409 genérico (antes vazava o P2002 como
// 500) sem confirmar de quem é o CPF; e-mail duplicado segue 409 EMAIL_TAKEN; e dois
// cadastros simultâneos com o mesmo dado nunca terminam em 500.

import { randomBytes } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../config/database.js'
import {
  deleteUser,
  startApp,
  stopApp,
  uniqueEmail,
  uniqueIp,
  uniqueValidCpf,
} from '../../../test/integration.helpers.js'

const GENERIC_MESSAGE = 'Não foi possível concluir o cadastro com esses dados'

let app: FastifyInstance | undefined
// Set: alguns testes repetem o e-mail de propósito, e a limpeza não pode apagar o mesmo usuário duas vezes.
const emails = new Set<string>()

beforeAll(async () => {
  app = await startApp()
}, 30000)

afterAll(async () => {
  await stopApp(app)
  await Promise.all([...emails].map(deleteUser))
}, 60000)

function registerAccount(fields: { email?: string; cpf?: string } = {}) {
  const email = fields.email ?? uniqueEmail('register-conflict')
  emails.add(email)
  return app!
    .inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: uniqueIp(),
      payload: {
        email,
        password: randomBytes(18).toString('base64url'),
        fullName: 'QA Conflito',
        ...(fields.cpf ? { cpf: fields.cpf } : {}),
      },
    })
    .then((res) => ({ email, res }))
}

const userExists = async (email: string): Promise<boolean> =>
  (await prisma.user.findUnique({ where: { email }, select: { id: true } })) !== null

describe('POST /api/v1/auth/register — CPF já usado', () => {
  it('outro e-mail com o mesmo CPF: 409 REGISTRATION_CONFLICT genérico, sem citar o CPF nem o dono, e a conta não é criada', async () => {
    const cpf = uniqueValidCpf()
    const owner = await registerAccount({ cpf })
    expect(owner.res.statusCode).toBe(201)

    const { email, res } = await registerAccount({ cpf })

    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({ error: 'REGISTRATION_CONFLICT', message: GENERIC_MESSAGE })
    const body = res.body.toLowerCase()
    expect(body).not.toContain(cpf)
    expect(body).not.toContain(owner.email.toLowerCase())
    expect(await userExists(email)).toBe(false)
  }, 60000)

  it('o mesmo CPF com e sem máscara é o mesmo CPF (o cadastro guarda só os dígitos)', async () => {
    const cpf = uniqueValidCpf()
    const masked = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
    expect((await registerAccount({ cpf: masked })).res.statusCode).toBe(201)

    const duplicate = await registerAccount({ cpf })

    expect(duplicate.res.statusCode).toBe(409)
    expect(duplicate.res.json().error).toBe('REGISTRATION_CONFLICT')
  }, 60000)
})

describe('POST /api/v1/auth/register — e-mail já usado', () => {
  it('e-mail duplicado continua 409 EMAIL_TAKEN', async () => {
    const first = await registerAccount()

    const { res } = await registerAccount({ email: first.email })

    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('EMAIL_TAKEN')
  }, 60000)

  it('e-mail E CPF duplicados: responde EMAIL_TAKEN (como sempre), sem dizer nada do CPF', async () => {
    const cpf = uniqueValidCpf()
    const first = await registerAccount({ cpf })

    const { res } = await registerAccount({ email: first.email, cpf })

    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('EMAIL_TAKEN')
    expect(res.body.toLowerCase()).not.toContain('cpf')
  }, 60000)
})

describe('POST /api/v1/auth/register — cadastros simultâneos', () => {
  it('mesmo CPF, e-mails diferentes, ao mesmo tempo: um 201 e um 409 REGISTRATION_CONFLICT, nunca 500', async () => {
    const cpf = uniqueValidCpf()

    const [a, b] = await Promise.all([registerAccount({ cpf }), registerAccount({ cpf })])

    expect([a.res.statusCode, b.res.statusCode].sort()).toEqual([201, 409])
    const loser = a.res.statusCode === 409 ? a : b
    expect(loser.res.json().error).toBe('REGISTRATION_CONFLICT')
    expect(await userExists(loser.email)).toBe(false)
  }, 60000)

  it('mesmo e-mail ao mesmo tempo: um 201 e um 409 EMAIL_TAKEN, nunca 500', async () => {
    const email = uniqueEmail('register-race')

    const [a, b] = await Promise.all([registerAccount({ email }), registerAccount({ email })])

    expect([a.res.statusCode, b.res.statusCode].sort()).toEqual([201, 409])
    const loser = a.res.statusCode === 409 ? a : b
    expect(loser.res.json().error).toBe('EMAIL_TAKEN')
  }, 60000)
})
