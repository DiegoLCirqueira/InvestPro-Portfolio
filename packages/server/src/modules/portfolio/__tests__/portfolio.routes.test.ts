// @investpro/server
// Testes de INTEGRAÇÃO das rotas autenticadas de portfólio contra o PostgreSQL real.
// O token é gerado com o mesmo JWT_SECRET (autenticate valida user no DB real),
// evitando estourar o rate-limit de /auth/login. Lê os dados do seed (5 posições).

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../config/database.js'
import { startApp, stopApp, signAccessTokenFor } from '../../../test/integration.helpers.js'

let app: FastifyInstance | undefined
let token = ''
let userId = ''

beforeAll(async () => {
  app = await startApp()
  const user = await prisma.user.findUnique({
    where: { email: 'diego@investpro.com' },
    select: { id: true },
  })
  userId = user!.id
  token = signAccessTokenFor(userId)
})

afterAll(async () => {
  await stopApp(app)
})

describe('GET /api/v1/portfolio', () => {
  it('retorna o portfólio do seed com saldo e 5 posições (200)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.balance).toBe(175450.32)
    expect(body.positions).toHaveLength(5)
    const tickers = body.positions.map((p: { ticker: string }) => p.ticker)
    expect(tickers).toContain('BTC')
    expect(tickers).toContain('VALE3')
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/portfolio' })
    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('UNAUTHORIZED')
  })

  it('retorna 401 com token inválido', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio',
      headers: { authorization: 'Bearer token-invalido' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('UNAUTHORIZED')
  })
})

describe('GET /api/v1/portfolio/history', () => {
  it('retorna série temporal para period=7d (8 pontos: 0..7)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio/history?period=7d',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.history)).toBe(true)
    expect(body.history).toHaveLength(8)
    body.history.forEach((p: { date: string; balance: number }) => {
      expect(typeof p.date).toBe('string')
      expect(typeof p.balance).toBe('number')
    })
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/portfolio/history?period=7d' })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/v1/portfolio/diversification', () => {
  it('retorna composição por tipo de ativo com percentuais (200)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio/diversification',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.totalBalance).toBe(175450.32)
    expect(body.breakdown.length).toBeGreaterThanOrEqual(3)
    const types = body.breakdown.map((b: { type: string }) => b.type)
    expect(types).toContain('STOCK')
    expect(types).toContain('CRYPTO')
    expect(types).toContain('FIXED_INCOME')
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/portfolio/diversification' })
    expect(res.statusCode).toBe(401)
  })
})
