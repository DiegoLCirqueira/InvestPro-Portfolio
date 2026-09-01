// @investpro/server
// Testes de INTEGRAÇÃO do portfolio.service contra o PostgreSQL real (seed).
// Preenche a lacuna de cobertura do service usando dados reais do banco.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../../config/database.js'
import { AppError } from '../../auth/auth.service.js'
import { getDiversification, getHistory, getPortfolio } from '../portfolio.service.js'

let seedUserId = ''

beforeAll(async () => {
  const seed = await prisma.user.findUnique({
    where: { email: 'diego@investpro.com' },
    select: { id: true },
  })
  seedUserId = seed!.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('getPortfolio', () => {
  it('retorna saldo e posições do seed no DB real', async () => {
    const result = await getPortfolio(seedUserId)
    expect(result.balance).toBe(175450.32)
    expect(result.positions).toHaveLength(5)
    expect(result.positions.map((p) => p.ticker)).toEqual(
      expect.arrayContaining(['BTC', 'ETH', 'VALE3', 'ITUB4', 'SELIC'])
    )
    expect(result.positions[0]).toHaveProperty('avgPrice')
  })

  it('lança 404 PORTFOLIO_NOT_FOUND para usuário sem portfólio', async () => {
    await expect(getPortfolio('user-inexistente')).rejects.toMatchObject<AppError>({
      code: 'PORTFOLIO_NOT_FOUND',
      statusCode: 404,
    })
  })
})

describe('getHistory', () => {
  it('gera série de 8 pontos para period=7d', async () => {
    const result = await getHistory(seedUserId, { period: '7d' })
    expect(result.history).toHaveLength(8)
    expect(result.history.every((h) => h.balance > 0)).toBe(true)
  })

  it('gera série de 31 pontos para period=30d', async () => {
    const result = await getHistory(seedUserId, { period: '30d' })
    expect(result.history).toHaveLength(31)
  })
})

describe('getDiversification', () => {
  it('agrupa por tipo com base no saldo real', async () => {
    const result = await getDiversification(seedUserId)
    expect(result.totalBalance).toBe(175450.32)
    const sumPct = result.breakdown.reduce((acc, b) => acc + b.percentage, 0)
    expect(sumPct).toBeCloseTo(100, 0)
    expect(result.breakdown.map((b) => b.type)).toEqual(
      expect.arrayContaining(['STOCK', 'CRYPTO', 'FIXED_INCOME'])
    )
  })
})
