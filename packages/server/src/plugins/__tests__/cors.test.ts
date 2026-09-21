// @investpro/server
// CORS: o frontend (outra origem) só lê Retry-After e x-ratelimit-* se o servidor
// os expuser via access-control-expose-headers. As origens permitidas não mudam.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { env } from '../../config/env.js'
import { startApp, stopApp } from '../../test/integration.helpers.js'

let app: FastifyInstance | undefined

beforeAll(async () => {
  app = await startApp()
})

afterAll(async () => {
  await stopApp(app)
})

function getCurrenciesFrom(origin: string) {
  return app!.inject({
    method: 'GET',
    url: '/api/v1/exchange/currencies',
    headers: { origin },
  })
}

describe('CORS', () => {
  it('expõe Retry-After e x-ratelimit-* ao frontend', async () => {
    const res = await getCurrenciesFrom(env.CORS_ORIGINS[0])

    const exposed = String(res.headers['access-control-expose-headers']).toLowerCase()
    expect(exposed.split(/\s*,\s*/)).toEqual(
      expect.arrayContaining(['retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining'])
    )
  })

  it('não amplia origens: uma origem estranha não é refletida em allow-origin', async () => {
    const res = await getCurrenciesFrom('https://evil.example')

    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.example')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })
})
