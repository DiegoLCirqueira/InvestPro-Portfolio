// @investpro/server
// Testes de INTEGRAÇÃO das rotas autenticadas de transferências contra o PostgreSQL real.
// O transfer.service mantém estado em memória por usuário; usa usuário de teste novo.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import {
  deleteUser,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
  uniqueIp,
} from '../../../test/integration.helpers.js'

let app: FastifyInstance | undefined
let email = ''
let token = ''

beforeAll(async () => {
  app = await startApp()
  email = uniqueEmail('transfer')
  const reg = await registerTestUser(app, email)
  token = reg.body.accessToken as string
})

afterAll(async () => {
  await stopApp(app)
  await deleteUser(email)
})

describe('POST /api/v1/transfers', () => {
  it('cria transferência PIX e executa (200 COMPLETED)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: {
        type: 'PIX',
        amount: 50.5,
        toAccount: { id: 'acc-1', bank: '001', agency: '0001', account: '12345-6', holderName: 'QA' },
        description: 'Teste PIX',
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.type).toBe('PIX')
    expect(body.amount).toBe(50.5)
    expect(body.status).toBe('COMPLETED')
    expect(body.id).toBeTruthy()
  })

  it('retorna 400 para transferência inválida (amount negativo)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { type: 'PIX', amount: -10 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      remoteAddress: uniqueIp(),
      payload: { type: 'PIX', amount: 10 },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/v1/transfers', () => {
  it('lista as transferências do usuário (200)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/transfers?page=1&limit=10',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.total).toBeGreaterThanOrEqual(1)
  })

  it('retorna 401 com token inválido', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/transfers',
      headers: { authorization: 'Bearer token-invalido' },
    })
    expect(res.statusCode).toBe(401)
  })
})
