// @investpro/server
// Testes de INTEGRAÇÃO das rotas autenticadas de risco contra o PostgreSQL real.
// Usa o seed user (5 posições + saldo) para validar o cálculo end-to-end.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../config/database.js'
import { startApp, stopApp, signAccessTokenFor } from '../../../test/integration.helpers.js'

let app: FastifyInstance | undefined
let token = ''

beforeAll(async () => {
  app = await startApp()
  const seed = await prisma.user.findUnique({
    where: { email: 'diego@investpro.com' },
    select: { id: true },
  })
  token = signAccessTokenFor(seed!.id)
})

afterAll(async () => {
  await stopApp(app)
})

describe('GET /api/v1/risk/report', () => {
  it('retorna relatório de risco com métricas do seed (200)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/risk/report',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(typeof body.var95).toBe('number')
    expect(typeof body.maxDrawdown).toBe('number')
    expect(typeof body.sharpe).toBe('number')
    expect(typeof body.volatility).toBe('number')
    expect(typeof body.updatedAt).toBe('string')
    expect(Array.isArray(body.metrics)).toBe(true)
    expect(body.metrics.length).toBeGreaterThanOrEqual(4)
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/risk/report' })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/v1/risk/metrics', () => {
  it('retorna a lista de relatórios (200)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/risk/metrics',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toHaveProperty('var95')
    expect(typeof body.updatedAt).toBe('string')
  })

  it('retorna 401 com token inválido', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/risk/metrics',
      headers: { authorization: 'Bearer token-invalido' },
    })
    expect(res.statusCode).toBe(401)
  })
})
