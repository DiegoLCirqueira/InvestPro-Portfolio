// @investpro/server
// Testes de INTEGRAÇÃO das rotas autenticadas de usuário contra o PostgreSQL real.
// GET /users/me usa o seed user (leitura). PATCH /users/me usa um usuário de teste
// novo (para não alterar o seed) e faz cleanup no DB.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../config/database.js'
import {
  deleteUser,
  registerTestUser,
  startApp,
  stopApp,
  signAccessTokenFor,
  uniqueEmail,
  uniqueIp,
} from '../../../test/integration.helpers.js'

let app: FastifyInstance | undefined
let seedUserId = ''
let seedToken = ''

beforeAll(async () => {
  app = await startApp()
  const seed = await prisma.user.findUnique({
    where: { email: 'diego@investpro.com' },
    select: { id: true },
  })
  seedUserId = seed!.id
  seedToken = signAccessTokenFor(seedUserId)
})

afterAll(async () => {
  await stopApp(app)
})

describe('GET /api/v1/users/me', () => {
  it('retorna o perfil do seed user sem passwordHash (200)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${seedToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.email).toBe('diego@investpro.com')
    expect(body.fullName).toBe('Diego')
    expect(body.role).toBe('USER')
    expect(body).not.toHaveProperty('passwordHash')
    expect(typeof body.createdAt).toBe('string')
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/users/me' })
    expect(res.statusCode).toBe(401)
  })

  it('retorna 401 com token inválido', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: 'Bearer abc.def.ghi' },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('PATCH /api/v1/users/me', () => {
  const email = uniqueEmail('patch')
  let accessToken = ''

  beforeAll(async () => {
    const reg = await registerTestUser(app!, email)
    accessToken = reg.body.accessToken as string
  })

  it('atualiza o fullName do usuário de teste (200)', async () => {
    const res = await app!.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { fullName: 'QA Atualizado' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().fullName).toBe('QA Atualizado')
  })

  it('rejeita tentativa de alterar CPF (somente leitura) com 400', async () => {
    const res = await app!.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { cpf: '123.456.789-00' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 401 sem token (com body válido)', async () => {
    const res = await app!.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      remoteAddress: uniqueIp(),
      payload: { fullName: 'Nome Válido' },
    })
    expect(res.statusCode).toBe(401)
  })

  afterAll(async () => {
    await deleteUser(email)
  })
})
