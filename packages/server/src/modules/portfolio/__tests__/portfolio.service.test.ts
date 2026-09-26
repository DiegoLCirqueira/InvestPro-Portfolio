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

describe('getDiversification', () => {
  it('agrupa por tipo sobre o total INVESTIDO (sem o caixa): as fatias somam 100%', async () => {
    const result = await getDiversification(seedUserId)
    // Seed: soma de currentValue das 5 posições = 175450.32 (o caixa, também
    // 175450.32, fica de fora do denominador).
    expect(result.totalBalance).toBe(175450.32)
    const sumPct = result.breakdown.reduce((acc, b) => acc + b.percentage, 0)
    expect(sumPct).toBeCloseTo(100, 0)
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
    await prisma.portfolioSnapshot.deleteMany({ where: { userId } })
    await prisma.position.deleteMany({ where: { portfolio: { userId } } })
    await prisma.portfolio.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
  })

  it('uma compra que move valor de caixa para posição não muda o patrimônio total nem distorce os percentuais', async () => {
    // Só caixa, nada investido: diversificação vazia (o caixa não é fatia).
    const before = await getDiversification(userId)
    expect(before.totalBalance).toBe(0)
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

    // Tudo que está investido é a ação: 100%, mesmo com R$ 600 em caixa.
    const afterDiversification = await getDiversification(userId)
    expect(afterDiversification.totalBalance).toBe(400)
    expect(afterDiversification.breakdown).toHaveLength(1)
    expect(afterDiversification.breakdown[0]).toMatchObject({
      type: 'STOCK',
      value: 400,
      percentage: 100,
    })

    // Moeda estrangeira (câmbio) vira uma fatia própria, em BRL, e entra no
    // total investido; as fatias continuam somando 100%.
    await prisma.currencyHolding.create({ data: { userId, currency: 'USD', balance: 100 } })
    const withForeign = await getDiversification(userId)
    const foreign = withForeign.breakdown.find((item) => item.type === 'FOREIGN_CURRENCY')
    expect(foreign).toMatchObject({ label: 'Moedas estrangeiras' })
    expect(foreign!.value).toBeGreaterThan(0)
    expect(withForeign.totalBalance).toBeCloseTo(400 + foreign!.value, 2)
    const sumPct = withForeign.breakdown.reduce((acc, item) => acc + item.percentage, 0)
    expect(sumPct).toBeCloseTo(100, 0)
    await prisma.currencyHolding.deleteMany({ where: { userId } })

    // Card "Valor Total" do Painel: patrimônio total, não só o caixa (600).
    const summary = await getPortfolio(userId)
    expect(summary.balance).toBe(600)
    expect(summary.totalEquity).toBe(1000)

    // Conta sem histórico: a série começa hoje, no patrimônio real (a compra
    // não mudou o total), sem curva inventada sobre o saldo.
    const history = await getHistory(userId, { period: '7d' })
    expect(history.history).toHaveLength(1)
    expect(history.history[0]).toMatchObject({ balance: 1000, netFlow: 0 })
    expect(history.returnPct).toBeNull()
  })
})
