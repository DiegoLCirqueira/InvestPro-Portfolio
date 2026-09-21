// @investpro/server
// CORS com uma ou mais origens (migração de domínio): registerCors num Fastify
// enxuto, sem banco. Com duas origens, cada uma recebe de volta SÓ a própria origem
// em access-control-allow-origin (nunca a lista) e credentials true; uma terceira
// não é liberada. Com uma origem, o comportamento é o de sempre.

import Fastify from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { registerCors } from '../cors.js'

const OLD_ORIGIN = 'https://investpro1-five.vercel.app'
const NEW_ORIGIN = 'https://investpro.dev.br'
const OTHER_ORIGIN = 'https://evil.example'

const apps: FastifyInstance[] = []

async function appAllowing(origins: string[]): Promise<FastifyInstance> {
  const app = Fastify()
  await registerCors(app, origins)
  app.get('/ping', async () => ({ ok: true }))
  await app.ready()
  apps.push(app)
  return app
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

const simpleRequest = (app: FastifyInstance, origin: string) =>
  app.inject({ method: 'GET', url: '/ping', headers: { origin } })

const preflight = (app: FastifyInstance, origin: string) =>
  app.inject({
    method: 'OPTIONS',
    url: '/ping',
    headers: {
      origin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type,authorization',
    },
  })

describe('CORS com duas origens', () => {
  it.each([OLD_ORIGIN, NEW_ORIGIN])('requisição simples de %s: allow-origin é a própria origem (nunca a lista) e credentials true', async (origin) => {
    const app = await appAllowing([OLD_ORIGIN, NEW_ORIGIN])

    const res = await simpleRequest(app, origin)

    expect(res.statusCode).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe(origin)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
    expect(res.headers.vary).toMatch(/origin/i)
  })

  it.each([OLD_ORIGIN, NEW_ORIGIN])('preflight de %s: 204 com allow-origin igual à origem, credentials, métodos e headers permitidos', async (origin) => {
    const app = await appAllowing([OLD_ORIGIN, NEW_ORIGIN])

    const res = await preflight(app, origin)

    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe(origin)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
    expect(res.headers['access-control-allow-methods']).toContain('POST')
    expect(String(res.headers['access-control-allow-headers']).toLowerCase()).toContain('authorization')
  })

  it('uma terceira origem NÃO é liberada, nem na requisição simples nem no preflight', async () => {
    const app = await appAllowing([OLD_ORIGIN, NEW_ORIGIN])

    const simple = await simpleRequest(app, OTHER_ORIGIN)
    const pre = await preflight(app, OTHER_ORIGIN)

    // Sem access-control-allow-origin o navegador bloqueia a resposta (o plugin manda
    // o allow-credentials mesmo assim, o que não libera nada sozinho).
    for (const res of [simple, pre]) {
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    }
  })

  it('o allow-origin nunca vira a lista com as duas origens', async () => {
    const app = await appAllowing([OLD_ORIGIN, NEW_ORIGIN])

    const res = await simpleRequest(app, NEW_ORIGIN)

    expect(String(res.headers['access-control-allow-origin'])).not.toContain(',')
  })

  it('Retry-After e x-ratelimit-* continuam expostos ao frontend', async () => {
    const app = await appAllowing([OLD_ORIGIN, NEW_ORIGIN])

    const res = await simpleRequest(app, OLD_ORIGIN)

    const exposed = String(res.headers['access-control-expose-headers']).toLowerCase().split(/\s*,\s*/)
    expect(exposed).toEqual(expect.arrayContaining(['retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining']))
  })
})

describe('CORS com uma origem (igual ao comportamento anterior)', () => {
  it('a origem configurada recebe allow-origin e credentials; headers expostos presentes', async () => {
    const app = await appAllowing([NEW_ORIGIN])

    const res = await simpleRequest(app, NEW_ORIGIN)

    expect(res.headers['access-control-allow-origin']).toBe(NEW_ORIGIN)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
    expect(String(res.headers['access-control-expose-headers']).toLowerCase()).toContain('retry-after')
  })

  it('uma origem estranha nunca é refletida (allow-origin segue sendo a configurada, que o navegador recusa)', async () => {
    const app = await appAllowing([NEW_ORIGIN])

    const res = await simpleRequest(app, OTHER_ORIGIN)

    expect(res.headers['access-control-allow-origin']).toBe(NEW_ORIGIN)
    expect(res.headers['access-control-allow-origin']).not.toBe(OTHER_ORIGIN)
  })
})
