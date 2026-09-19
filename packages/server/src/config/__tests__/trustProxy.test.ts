// @investpro/server
// trustProxy: o rate limit por IP só agrupa o mesmo cliente atrás do proxy da
// Railway se o Fastify ler o IP real do X-Forwarded-For, e só é seguro se um
// X-Forwarded-For forjado (por um cliente atrás do proxy OU conectando direto)
// não der um balde novo a cada request. Parte unitária (parse da env) + parte de
// integração com fastify.inject no login (5/min por IP).

import { afterAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../../server.js'
import { parseTrustProxy } from '../trustProxy.js'
import { uniqueEmail } from '../../test/integration.helpers.js'

describe('parseTrustProxy', () => {
  it('sem variável: rede interna do proxy da Railway em produção, ninguém fora dela', () => {
    expect(parseTrustProxy(undefined, true)).toBe('100.64.0.0/10,uniquelocal')
    expect(parseTrustProxy('  ', true)).toBe('100.64.0.0/10,uniquelocal')
    expect(parseTrustProxy(undefined, false)).toBe(false)
  })

  it('valor explícito vale em qualquer ambiente; "false" desliga inclusive em produção', () => {
    expect(parseTrustProxy(' 10.0.0.0/8 ', false)).toBe('10.0.0.0/8')
    expect(parseTrustProxy('loopback,10.0.0.1', true)).toBe('loopback,10.0.0.1')
    expect(parseTrustProxy('FALSE', true)).toBe(false)
  })
})

const PRODUCTION_TRUST_PROXY = parseTrustProxy(undefined, true)
const RAILWAY_PROXY_IP = '100.64.0.7' // par imediato: o proxy da Railway
const PUBLIC_DIRECT_CLIENT_IP = '198.51.100.99' // alguém conectando direto ao app
const LOGIN_LIMIT = 5

const apps: FastifyInstance[] = []

async function buildApp(trustProxy?: string | false): Promise<FastifyInstance> {
  const app = await buildServer(trustProxy === undefined ? {} : { trustProxy })
  apps.push(app)
  return app
}

// Login errado com e-mail novo a cada tentativa (não aciona o bloqueio por conta).
function wrongLogin(app: FastifyInstance, peerIp: string, forwardedFor: string) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    remoteAddress: peerIp,
    headers: { 'x-forwarded-for': forwardedFor },
    payload: { email: uniqueEmail('trust-proxy'), password: 'SenhaErrada123' },
  })
}

async function statusesOfAttempts(count: number, attempt: (index: number) => Promise<{ statusCode: number }>) {
  const statuses: number[] = []
  for (let i = 0; i < count; i++) statuses.push((await attempt(i)).statusCode)
  return statuses
}

const ALL_UNAUTHORIZED = Array(LOGIN_LIMIT).fill(401)

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()))
})

describe('rate limit por IP com a configuração de produção', () => {
  it('clientes distintos (X-Forwarded-For diferente) têm baldes separados; o mesmo cliente repetido leva 429', async () => {
    const app = await buildApp(PRODUCTION_TRUST_PROXY)
    const wrongLoginAs = (client: string) => wrongLogin(app, RAILWAY_PROXY_IP, client)

    expect(await statusesOfAttempts(LOGIN_LIMIT, () => wrongLoginAs('203.0.113.10'))).toEqual(ALL_UNAUTHORIZED)

    const clientARepeated = await wrongLoginAs('203.0.113.10')
    expect(clientARepeated.statusCode).toBe(429)
    expect(clientARepeated.json().error).toBe('RATE_LIMIT_EXCEEDED')

    // Cliente B, mesmo proxy: balde novo, com o limite inteiro.
    const clientB = await wrongLoginAs('203.0.113.20')
    expect(clientB.statusCode).toBe(401)
    expect(clientB.headers['x-ratelimit-remaining']).toBe(String(LOGIN_LIMIT - 1))
  }, 120000)

  it('X-Forwarded-For forjado à esquerda do IP anexado pelo proxy NÃO burla o limite', async () => {
    const app = await buildApp(PRODUCTION_TRUST_PROXY)
    const realClient = '198.51.100.7' // o que o proxy anexa

    const forged = (i: number) => wrongLogin(app, RAILWAY_PROXY_IP, `192.0.2.${i + 1}, ${realClient}`)
    expect(await statusesOfAttempts(LOGIN_LIMIT, forged)).toEqual(ALL_UNAUTHORIZED)

    expect((await forged(98)).statusCode).toBe(429)
  }, 120000)

  it('conexão DIRETA (par fora da rede do proxy) não pode forjar X-Forwarded-For: o header é ignorado', async () => {
    const app = await buildApp(PRODUCTION_TRUST_PROXY)

    const forged = (i: number) => wrongLogin(app, PUBLIC_DIRECT_CLIENT_IP, `192.0.2.${i + 1}`)
    expect(await statusesOfAttempts(LOGIN_LIMIT, forged)).toEqual(ALL_UNAUTHORIZED)

    expect((await forged(98)).statusCode).toBe(429)
  }, 120000)

  it('saltos internos do proxy no X-Forwarded-For (100.64.x) são absorvidos: mesmo cliente, mesmo balde', async () => {
    const app = await buildApp(PRODUCTION_TRUST_PROXY)
    const client = '203.0.113.30'

    const viaInternalHop = () => wrongLogin(app, RAILWAY_PROXY_IP, `${client}, 100.64.0.9`)
    expect(await statusesOfAttempts(LOGIN_LIMIT, viaInternalHop)).toEqual(ALL_UNAUTHORIZED)

    // Sem o salto interno é o mesmo cliente: já está no limite.
    expect((await wrongLogin(app, RAILWAY_PROXY_IP, client)).statusCode).toBe(429)
  }, 120000)
})

describe('rate limit por IP com o padrão de desenvolvimento/testes (sem confiar em proxy)', () => {
  it('ignora X-Forwarded-For mesmo vindo de um par da rede do proxy: variar o header não dá balde novo', async () => {
    const app = await buildApp()

    const varied = (i: number) => wrongLogin(app, RAILWAY_PROXY_IP, `192.0.2.${i + 1}`)
    expect(await statusesOfAttempts(LOGIN_LIMIT, varied)).toEqual(ALL_UNAUTHORIZED)

    expect((await varied(98)).statusCode).toBe(429)
  }, 120000)
})
