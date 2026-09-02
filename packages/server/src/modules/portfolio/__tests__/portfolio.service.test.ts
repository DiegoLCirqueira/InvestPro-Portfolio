// @investpro/server
// Testes de INTEGRAÇÃO do portfolio.service contra o PostgreSQL real (seed).
// Preenche a lacuna de cobertura do service usando dados reais do banco.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../../config/database.js'
import { AppError } from '../../auth/auth.service.js'
import { uniqueEmail } from '../../../test/integration.helpers.js'
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
  it('agrupa por tipo com base no patrimônio total (caixa + posições, WI-14)', async () => {
    const result = await getDiversification(seedUserId)
    // Seed: balance 175450.32 + soma de currentValue das 5 posições (175450.32) = 350900.64.
    expect(result.totalBalance).toBe(350900.64)
    // As posições somam exatamente metade do patrimônio total nesse seed
    // (currentValue total == balance), então os percentuais devem somar ~50,
    // não 100 — sob o bug antigo (denominador = só o caixa) essa soma dava
    // 100 "por coincidência", mascarando o problema.
    const sumPct = result.breakdown.reduce((acc, b) => acc + b.percentage, 0)
    expect(sumPct).toBeCloseTo(50, 0)
    expect(result.breakdown.map((b) => b.type)).toEqual(
      expect.arrayContaining(['STOCK', 'CRYPTO', 'FIXED_INCOME'])
    )
  })
})

describe('getDiversification / getHistory usam patrimônio total como base (WI-14)', () => {
  let userId = ''
  let email = ''

  beforeAll(async () => {
    email = uniqueEmail('portfolio-equity')
    const user = await prisma.user.create({
      data: { email, passwordHash: 'x', fullName: 'Equity Test' },
    })
    userId = user.id
    await prisma.portfolio.create({ data: { userId, balance: 1000 } })
  })

  afterAll(async () => {
    await prisma.position.deleteMany({ where: { portfolio: { userId } } })
    await prisma.portfolio.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
  })

  it('uma compra que move valor de caixa para posição não muda o patrimônio total nem distorce os percentuais', async () => {
    const before = await getDiversification(userId)
    expect(before.totalBalance).toBe(1000)
    expect(before.breakdown).toEqual([])

    // Simula o efeito de uma ordem BUY FILLED (WI-12): decrementa balance e
    // cria a Position no mesmo valor (menos arredondamento) — o patrimônio
    // total (caixa + posições) deve permanecer o mesmo.
    const portfolio = await prisma.portfolio.findUniqueOrThrow({ where: { userId } })
    await prisma.$transaction([
      prisma.portfolio.update({ where: { id: portfolio.id }, data: { balance: { decrement: 400 } } }),
      prisma.position.create({
        data: {
          portfolioId: portfolio.id,
          ticker: 'VALE3',
          name: 'Vale ON',
          type: 'STOCK',
          quantity: 20,
          avgPrice: 20,
          currentValue: 400,
        },
      }),
    ])

    const afterDiversification = await getDiversification(userId)
    expect(afterDiversification.totalBalance).toBe(1000)
    expect(afterDiversification.breakdown).toHaveLength(1)
    expect(afterDiversification.breakdown[0]).toMatchObject({
      type: 'STOCK',
      value: 400,
      percentage: 40,
    })

    const history = await getHistory(userId, { period: '7d' })
    expect(history.history).toHaveLength(8)
    // Ponto de hoje (i=0): factor = 1 + sin(0)*0.02 + (7/7)*0.05 = 1.05.
    const today = history.history[history.history.length - 1]
    expect(today.balance).toBe(1050)
  })
})
