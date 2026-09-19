// @investpro/server
// Testes de INTEGRAÇÃO de GET /api/v1/exchange/holdings (saldos por moeda do
// usuário autenticado) contra o PostgreSQL real. Os holdings são semeados direto
// via Prisma — o objetivo aqui é a leitura, não o câmbio (ver exchange.execute).

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { Currency } from '@investpro/shared'
import { prisma } from '../../../config/database.js'
import {
  deleteUser,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
} from '../../../test/integration.helpers.js'

let app: FastifyInstance | undefined
const emails: string[] = []

interface TestUser {
  id: string
  token: string
}

async function createUser(prefix: string): Promise<TestUser> {
  const email = uniqueEmail(prefix)
  emails.push(email)
  const reg = await registerTestUser(app!, email)
  return { id: reg.body.user.id as string, token: reg.body.accessToken as string }
}

async function seedHolding(
  userId: string,
  currency: Currency,
  balance: number,
  deletedAt: Date | null = null
) {
  await prisma.currencyHolding.create({ data: { userId, currency, balance, deletedAt } })
}

function getHoldings(token: string) {
  return app!.inject({
    method: 'GET',
    url: '/api/v1/exchange/holdings',
    headers: { authorization: `Bearer ${token}` },
  })
}

beforeAll(async () => {
  app = await startApp()
})

// Vários usuários contra o Postgres remoto: limpa em paralelo, acima do timeout default de 10s.
afterAll(async () => {
  await stopApp(app)
  await Promise.all(emails.map(deleteUser))
}, 60000)

describe('GET /api/v1/exchange/holdings', () => {
  it('retorna { items: [] } para usuário sem holdings', async () => {
    const user = await createUser('holdings-empty')

    const res = await getHoldings(user.token)

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ items: [] })
  })

  it('retorna só saldos positivos, ordenados por moeda (asc), ignorando zerados e deletados', async () => {
    const user = await createUser('holdings-list')
    // Inseridos fora de ordem (e USD antes de EUR na declaração do enum do
    // Postgres) pra provar que a ordenação é alfabética, não a do banco.
    await seedHolding(user.id, 'USD', 98)
    await seedHolding(user.id, 'JPY', 12345.5)
    await seedHolding(user.id, 'EUR', 10.25)
    await seedHolding(user.id, 'GBP', 0)
    await seedHolding(user.id, 'CHF', 50, new Date())

    const res = await getHoldings(user.token)

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      items: [
        { currency: 'EUR', balance: 10.25 },
        { currency: 'JPY', balance: 12345.5 },
        { currency: 'USD', balance: 98 },
      ],
    })
  })

  it('nunca expõe holdings de outro usuário', async () => {
    const owner = await createUser('holdings-owner')
    const other = await createUser('holdings-other')
    await seedHolding(owner.id, 'USD', 500)

    const res = await getHoldings(other.token)

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ items: [] })
  })

  it('ignora um userId enviado por query string (só vale o usuário autenticado)', async () => {
    const owner = await createUser('holdings-qs-owner')
    const other = await createUser('holdings-qs-other')
    await seedHolding(owner.id, 'USD', 500)

    const res = await app!.inject({
      method: 'GET',
      url: `/api/v1/exchange/holdings?userId=${owner.id}`,
      headers: { authorization: `Bearer ${other.token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ items: [] })
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/exchange/holdings' })
    expect(res.statusCode).toBe(401)
  })
})
