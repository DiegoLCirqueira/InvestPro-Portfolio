// @investpro/server
// Testes de INTEGRAÇÃO das rotas administrativas contra o PostgreSQL real.
// Um usuário de teste é promovido a ADMIN via Prisma direto (não há rota de
// promoção); outro permanece USER para validar o 403 do RBAC.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../config/database.js'
import {
  deleteUser,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
} from '../../../test/integration.helpers.js'

let app: FastifyInstance | undefined
let adminEmail = ''
let adminToken = ''
let userEmail = ''
let userToken = ''

beforeAll(async () => {
  app = await startApp()

  adminEmail = uniqueEmail('admin')
  const adminReg = await registerTestUser(app, adminEmail)
  adminToken = adminReg.body.accessToken as string
  await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } })

  userEmail = uniqueEmail('user')
  const userReg = await registerTestUser(app, userEmail)
  userToken = userReg.body.accessToken as string
})

afterAll(async () => {
  await stopApp(app)
  await deleteUser(adminEmail)
  await deleteUser(userEmail)
})

describe('GET /api/v1/admin/users', () => {
  it('retorna a lista de usuários para um ADMIN autenticado (200)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThanOrEqual(2)
    const emails = body.map((u: { email: string }) => u.email)
    expect(emails).toContain(adminEmail)
    expect(body.every((u: Record<string, unknown>) => !('passwordHash' in u))).toBe(true)
  })

  it('retorna 403 para um usuário USER autenticado', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${userToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/admin/users' })
    expect(res.statusCode).toBe(401)
  })
})
