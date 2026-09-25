// @investpro/server
// Swagger UI (/docs) é o mapa completo da API: em produção fica desligado por
// padrão (ENABLE_API_DOCS). Desligar não pode afetar as rotas da API.

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance | undefined

async function appWithDocs(flag: 'true' | 'false'): Promise<FastifyInstance> {
  vi.stubEnv('ENABLE_API_DOCS', flag)
  vi.resetModules()
  const { buildServer } = await import('../../server.js')
  app = await buildServer()
  return app
}

afterEach(async () => {
  await app?.close()
  app = undefined
  vi.unstubAllEnvs()
})

describe('ENABLE_API_DOCS', () => {
  it('false: /docs e /docs/json respondem 404, e a API segue funcionando', async () => {
    const server = await appWithDocs('false')

    expect((await server.inject({ method: 'GET', url: '/docs' })).statusCode).toBe(404)
    expect((await server.inject({ method: 'GET', url: '/docs/json' })).statusCode).toBe(404)
    expect((await server.inject({ method: 'GET', url: '/api/v1/exchange/currencies' })).statusCode).toBe(200)
  })

  it('true: /docs/json serve a spec com servidor relativo (sem localhost)', async () => {
    const server = await appWithDocs('true')

    const res = await server.inject({ method: 'GET', url: '/docs/json' })
    expect(res.statusCode).toBe(200)
    expect(res.json().servers).toEqual([{ url: '/' }])
  })
})
