// @investpro/server
// Testes de INTEGRAÇÃO do risk.service contra o PostgreSQL real (seed).
// Preenche a lacuna de cobertura calculando o relatório com dados reais do banco.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../../config/database.js'
import { AppError } from '../../auth/auth.service.js'
import { getRiskReport } from '../risk.service.js'

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

describe('getRiskReport', () => {
  it('calcula relatório completo com dados reais do seed', async () => {
    const report = await getRiskReport(seedUserId)
    expect(typeof report.var95).toBe('number')
    expect(typeof report.maxDrawdown).toBe('number')
    expect(typeof report.sharpe).toBe('number')
    expect(typeof report.volatility).toBe('number')
    expect(report.score).toBeGreaterThanOrEqual(0)
    expect(report.score).toBeLessThanOrEqual(100)
    expect(Array.isArray(report.metrics)).toBe(true)
    expect(report.metrics!.length).toBeGreaterThanOrEqual(4)
  })

  it('inclui métricas de concentração quando há posições', async () => {
    const report = await getRiskReport(seedUserId)
    expect(report.concentration).toBeGreaterThan(0)
    const metricNames = report.metrics!.map((m) => m.metric)
    expect(metricNames).toContain('Concentração (HHI)')
    expect(metricNames).toContain('Maior posição')
  })

  it('propaga 404 quando o portfólio não existe', async () => {
    await expect(getRiskReport('user-inexistente')).rejects.toMatchObject<AppError>({
      code: 'PORTFOLIO_NOT_FOUND',
      statusCode: 404,
    })
  })
})
