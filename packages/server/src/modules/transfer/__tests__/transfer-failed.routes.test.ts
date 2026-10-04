// @investpro/server
// Teste de INTEGRAÇÃO do caminho FAILED da transferência contra o PostgreSQL
// real. Hoje a execução externa simulada sempre dá sucesso; aqui ela é mockada
// pra falhar e provar que a transferência fica registrada sem debitar nada.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../config/database.js'
import {
  deleteUser,
  fundPortfolio,
  registerTestUser,
  startApp,
  stopApp,
  uniqueCpf,
  uniqueEmail,
  uniqueIp,
} from '../../../test/integration.helpers.js'

vi.mock('../transfer.domain.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../transfer.domain.js')>()
  return { ...mod, executeExternally: () => false }
})

let app: FastifyInstance | undefined
let email = ''
let token = ''
let userId = ''

beforeAll(async () => {
  app = await startApp()
  email = uniqueEmail('transfer-failed')
  const reg = await registerTestUser(app, email, uniqueCpf())
  token = reg.body.accessToken as string
  userId = reg.body.user.id as string
  await fundPortfolio(userId, 1000)
})

afterAll(async () => {
  await stopApp(app)
  await deleteUser(email)
})

describe('POST /api/v1/transfers — execução externa falhou', () => {
  it('registra a transferência FAILED sem debitar o saldo nem gravar fotografia', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/transfers',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      remoteAddress: uniqueIp(),
      payload: { type: 'TED', amount: 300, toAccount: { bank: '001', agency: '1234', account: '56789-0' } },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'FAILED', completedAt: null, failureReason: 'Execução externa falhou' })

    const [portfolio, transfers, snapshots] = await Promise.all([
      prisma.portfolio.findUniqueOrThrow({ where: { userId } }),
      prisma.transfer.findMany({ where: { userId }, select: { status: true } }),
      prisma.portfolioSnapshot.count({ where: { userId, reason: 'TRANSFER' } }),
    ])
    expect(portfolio.balance.toNumber()).toBe(1000)
    expect(transfers).toEqual([{ status: 'FAILED' }])
    expect(snapshots).toBe(0)
  })
})
