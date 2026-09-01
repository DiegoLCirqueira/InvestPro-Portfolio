// @investpro/server
// Testes de INTEGRAÇÃO das rotas públicas de mercado usando buildServer() + app.inject().
// Exercita validação Zod, error handler e handlers de rota. As cotações usam
// fallback estático determinístico quando a fonte externa não responde.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../../../server.js'

let app: FastifyInstance | undefined

beforeAll(async () => {
  app = await buildServer()
})

afterAll(async () => {
  await app?.close()
})

describe('GET /api/v1/market/assets', () => {
  it('retorna a lista de ativos com paginação', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/market/assets' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.items.length).toBeGreaterThan(0)
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('page')
    expect(body).toHaveProperty('limit')
  })

  it('filtra por tipo CRYPTO', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/market/assets?type=CRYPTO' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.items.every((a: { type: string }) => a.type === 'CRYPTO')).toBe(true)
  })

  it('busca por ticker', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/market/assets?search=petr' })
    expect(res.statusCode).toBe(200)
    expect(res.json().items.some((a: { ticker: string }) => a.ticker === 'PETR4')).toBe(true)
  })
})

describe('GET /api/v1/market/quotes/:ticker', () => {
  it('retorna cotação de ativo válido', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/market/quotes/PETR4' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.ticker).toBe('PETR4')
    expect(body.price).toBeGreaterThan(0)
  })

  it('retorna 404 para ticker desconhecido', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/market/quotes/NADA0' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('ASSET_NOT_FOUND')
  })
})

describe('GET /api/v1/market/assets/:ticker/history', () => {
  it('retorna série temporal para ativo válido', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/market/assets/PETR4/history?limit=7&interval=1d',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.ticker).toBe('PETR4')
    expect(body.points).toHaveLength(7)
  })

  it('retorna 404 para ativo desconhecido', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/market/assets/NOPE/history' })
    expect(res.statusCode).toBe(404)
  })
})