// @investpro/server
// Testes de INTEGRAÇÃO do perfil de investidor (GET/PUT) e das recomendações,
// contra o PostgreSQL real, com contas descartáveis.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { INVESTOR_QUESTIONS } from '@investpro/shared'
import { prisma } from '../../../config/database.js'
import {
  deleteUser,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
  uniqueIp,
} from '../../../test/integration.helpers.js'

let app: FastifyInstance | undefined
let token = ''
let userId = ''
const email = uniqueEmail('investor-profile')

const answerAll = (optionIndex: number) =>
  Object.fromEntries(INVESTOR_QUESTIONS.map((question) => [question.id, question.options[optionIndex].id]))

function call(method: 'GET' | 'PUT', url: string, payload?: object, auth = true) {
  return app!.inject({
    method,
    url,
    headers: auth ? { authorization: `Bearer ${token}` } : {},
    remoteAddress: uniqueIp(),
    ...(payload ? { payload } : {}),
  })
}

beforeAll(async () => {
  app = await startApp()
  const { body } = await registerTestUser(app, email)
  token = body.accessToken
  userId = body.user.id
})

afterAll(async () => {
  await deleteUser(email)
  await stopApp(app)
})

describe('perfil de investidor', () => {
  it('o questionário vem sem a pontuação das opções, com os 3 perfis e suas carteiras', async () => {
    const res = await call('GET', '/api/v1/users/me/investor-profile/questionnaire')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.questions).toHaveLength(INVESTOR_QUESTIONS.length)
    expect(JSON.stringify(body.questions)).not.toContain('points')
    expect(body.profiles.map((profile: { type: string }) => profile.type)).toEqual([
      'CONSERVATIVE',
      'MODERATE',
      'AGGRESSIVE',
    ])
  })

  it('conta nova ainda não tem perfil', async () => {
    const res = await call('GET', '/api/v1/users/me/investor-profile')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ profile: null })
  })

  it('o servidor calcula o perfil a partir das respostas e grava', async () => {
    const res = await call('PUT', '/api/v1/users/me/investor-profile', { answers: answerAll(3) })
    expect(res.statusCode).toBe(200)
    expect(res.json().profile).toMatchObject({ type: 'AGGRESSIVE', score: 28 })

    const saved = await call('GET', '/api/v1/users/me/investor-profile')
    expect(saved.json().profile).toMatchObject({ type: 'AGGRESSIVE', score: 28 })
  })

  it('refazer o questionário sobrescreve o perfil anterior', async () => {
    const res = await call('PUT', '/api/v1/users/me/investor-profile', { answers: answerAll(0) })
    expect(res.json().profile).toMatchObject({ type: 'CONSERVATIVE', score: 7 })
  })

  it('recusa (400) respostas incompletas, opção inexistente ou o perfil mandado pelo cliente', async () => {
    const incomplete = { ...answerAll(1) }
    delete incomplete[INVESTOR_QUESTIONS[0].id]
    expect((await call('PUT', '/api/v1/users/me/investor-profile', { answers: incomplete })).statusCode).toBe(400)

    const invalidOption = { ...answerAll(1), [INVESTOR_QUESTIONS[0].id]: 'nao-existe' }
    expect((await call('PUT', '/api/v1/users/me/investor-profile', { answers: invalidOption })).statusCode).toBe(400)

    const withProfile = { answers: answerAll(0), profile: 'AGGRESSIVE' }
    expect((await call('PUT', '/api/v1/users/me/investor-profile', withProfile)).statusCode).toBe(400)
  })

  it('exige autenticação (401)', async () => {
    expect((await call('GET', '/api/v1/users/me/investor-profile', undefined, false)).statusCode).toBe(401)
    expect((await call('PUT', '/api/v1/users/me/investor-profile', { answers: answerAll(0) }, false)).statusCode).toBe(401)
  })
})

describe('GET /api/v1/recommendations', () => {
  it('usa o perfil gravado: conta Conservadora só com o saldo inicial recebe a carteira de referência', async () => {
    const res = await call('GET', '/api/v1/recommendations')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.profile).toBe('CONSERVATIVE')
    expect(body.allocation).toHaveLength(4)
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(['start-investing', 'idle-cash'])
  })

  it('sem perfil, sugere o questionário', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { investorProfile: null, investorProfileScore: null, investorProfileAt: null },
    })
    const res = await call('GET', '/api/v1/recommendations')
    expect(res.json()).toMatchObject({ profile: null, allocation: [] })
    expect(res.json().items[0].id).toBe('take-questionnaire')
  })

  it('exige autenticação (401)', async () => {
    expect((await call('GET', '/api/v1/recommendations', undefined, false)).statusCode).toBe(401)
  })
})
