// @investpro/server
// Testes de INTEGRAÇÃO das rotas públicas de câmbio usando buildServer() + app.inject().
// Exercita o stack completo do Fastify (rota, validação Zod, error handler).
// A conversão usa a AwesomeAPI com fallback estático, então valores são
// determinísticos o suficiente para validação estrutural.

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

describe('GET /api/v1/exchange/currencies', () => {
  it('retorna lista de moedas com base BRL', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/exchange/currencies' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.base).toBe('BRL')
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items).toContain('USD')
    expect(body.items).toContain('JPY')
  })
})

describe('GET /api/v1/exchange/rates', () => {
  it('retorna taxa 1 para moeda com ela mesma', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/exchange/rates?from=BRL&to=BRL' })
    expect(res.statusCode).toBe(200)
    expect(res.json().rate).toBe(1)
  })

  it('retorna taxa positiva para par válido', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/exchange/rates?from=USD&to=BRL' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.rate).toBeGreaterThan(0)
    expect(body.from).toBe('USD')
    expect(body.to).toBe('BRL')
  })
})

describe('POST /api/v1/exchange/convert', () => {
  it('converte valor válido com fee', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/exchange/convert',
      payload: { from: 'USD', to: 'BRL', amount: 100 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.amount).toBe(100)
    expect(body.convertedAmount).toBeGreaterThanOrEqual(0)
    expect(body.fee).toBeGreaterThanOrEqual(0)
    expect(body.rate).toBeGreaterThan(0)
  })
})