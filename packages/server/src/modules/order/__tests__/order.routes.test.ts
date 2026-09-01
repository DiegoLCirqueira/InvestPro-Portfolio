// @investpro/server
// Testes de INTEGRAÇÃO das rotas autenticadas de ordens contra o PostgreSQL real.
// O market.service.getQuote é mockado para evitar chamadas reais de rede (brapi/
// coingecko). Usa um usuário de teste novo (store em memória isolado por userId).

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import {
  deleteUser,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
  uniqueIp,
} from '../../../test/integration.helpers.js'

const { getQuoteMock } = vi.hoisted(() => {
  return {
    getQuoteMock: vi.fn(),
  }
})

vi.mock('../../market/market.service.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../market/market.service.js')>()
  return { ...mod, getQuote: getQuoteMock }
})

import type { Quote } from '@investpro/shared'

let app: FastifyInstance | undefined
let email = ''
let token = ''

beforeAll(async () => {
  app = await startApp()
  email = uniqueEmail('order')
  const reg = await registerTestUser(app, email)
  token = reg.body.accessToken as string
  getQuoteMock.mockReset()
  getQuoteMock.mockImplementation(async (ticker: string): Promise<Quote> => {
    return { ticker, price: 20, change: 0, changePercent: 0 }
  })
})

afterAll(async () => {
  await stopApp(app)
  await deleteUser(email)
})

describe('POST /api/v1/orders', () => {
  it('cria ordem MARKET BUY e executa (200 FILLED)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { ticker: 'VALE3', side: 'BUY', quantity: 10, type: 'MARKET' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.ticker).toBe('VALE3')
    expect(body.side).toBe('BUY')
    expect(body.type).toBe('MARKET')
    expect(body.quantity).toBe(10)
    expect(['FILLED', 'OPEN', 'PENDING']).toContain(body.status)
    expect(body.id).toBeTruthy()
    expect(getQuoteMock).toHaveBeenCalledWith('VALE3')
  })

  it('retorna 400 para ordem inválida (quantidade negativa)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { ticker: 'VALE3', side: 'BUY', quantity: -5, type: 'MARKET' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/orders',
      remoteAddress: uniqueIp(),
      payload: { ticker: 'VALE3', side: 'BUY', quantity: 1, type: 'MARKET' },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/v1/orders', () => {
  it('lista as ordens do usuário (200)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/orders?page=1&limit=10',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(body.total).toBeGreaterThanOrEqual(1)
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/orders' })
    expect(res.statusCode).toBe(401)
  })
})
