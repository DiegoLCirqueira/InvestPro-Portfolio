// @investpro/server
// Testes de INTEGRAÇÃO: a Caixinha conta como Renda fixa na Diversificação e nas
// Recomendações, contra o PostgreSQL real, com contas descartáveis.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../config/database.js'
import {
  deleteUser,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
  uniqueIp,
} from '../../../test/integration.helpers.js'

let app: FastifyInstance | undefined
const emails: string[] = []

beforeAll(async () => {
  app = await startApp()
})

afterAll(async () => {
  await stopApp(app)
  await Promise.all(emails.map(deleteUser))
})

// Perfil Moderado (referência 45% renda fixa) com R$ 900 na Caixinha e
// R$ 1.100 em ações: renda fixa = 45% do investido.
async function moderateWithSavingsBox(savingsBox: number, stocks: number) {
  const email = uniqueEmail('div-savings')
  emails.push(email)
  const { body } = await registerTestUser(app!, email)
  const userId = body.user.id as string
  // Perfil gravado direto (o questionário já tem teste próprio); a pontuação só
  // precisa existir, o tipo vem de investorProfile.
  await prisma.user.update({
    where: { id: userId },
    data: { investorProfile: 'MODERATE', investorProfileScore: 0, investorProfileAt: new Date() },
  })
  await prisma.savingsBox.create({ data: { userId, balance: savingsBox } })
  if (stocks > 0) {
    const portfolio = await prisma.portfolio.findUniqueOrThrow({ where: { userId } })
    await prisma.position.create({
      data: { portfolioId: portfolio.id, ticker: 'VALE3', name: 'Vale', type: 'STOCK', quantity: 1, avgPrice: stocks, currentValue: stocks },
    })
  }
  return body.accessToken as string
}

function get(token: string, url: string) {
  return app!.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` }, remoteAddress: uniqueIp() })
}

describe('Caixinha como Renda fixa', () => {
  it('Diversificação soma a Caixinha em FIXED_INCOME e diz quanto dela é Caixinha', async () => {
    const token = await moderateWithSavingsBox(900, 1100)

    const res = await get(token, '/api/v1/portfolio/diversification')

    expect(res.statusCode).toBe(200)
    expect(res.json().totalBalance).toBe(2000)
    expect(res.json().breakdown).toEqual([
      expect.objectContaining({ type: 'STOCK', value: 1100, percentage: 55 }),
      expect.objectContaining({ type: 'FIXED_INCOME', value: 900, percentage: 45, savingsBox: 900 }),
    ])
    expect(res.json().breakdown[0]).not.toHaveProperty('savingsBox')
  })

  it('só Caixinha: 100% em Renda fixa', async () => {
    const token = await moderateWithSavingsBox(500, 0)

    const res = await get(token, '/api/v1/portfolio/diversification')

    expect(res.json().breakdown).toEqual([
      expect.objectContaining({ type: 'FIXED_INCOME', value: 500, percentage: 100, savingsBox: 500 }),
    ])
  })

  it('Recomendações não pedem mais renda fixa a quem já a tem na Caixinha', async () => {
    const token = await moderateWithSavingsBox(900, 1100)

    const res = await get(token, '/api/v1/recommendations')

    expect(res.statusCode).toBe(200)
    const fixedIncome = res.json().allocation.find((item: { type: string }) => item.type === 'FIXED_INCOME')
    expect(fixedIncome).toMatchObject({ currentPct: 45, targetPct: 45 })
    const ids = res.json().items.map((item: { id: string }) => item.id)
    expect(ids).not.toContain('increase-FIXED_INCOME')
    expect(ids).toContain('reduce-STOCK')
  })
})
