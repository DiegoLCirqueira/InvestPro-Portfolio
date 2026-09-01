import { describe, expect, it } from 'vitest'
import { calculateDiversification, TYPE_LABELS } from '../portfolio.domain.js'

describe('calculateDiversification', () => {
  it('agrupa posições por tipo de ativo', () => {
    const result = calculateDiversification(
      [
        { type: 'STOCK', currentValue: 400 },
        { type: 'STOCK', currentValue: 600 },
        { type: 'CRYPTO', currentValue: 1000 },
      ],
      2000,
    )

    expect(result.totalBalance).toBe(2000)
    expect(result.breakdown).toHaveLength(2)

    const stock = result.breakdown.find((b) => b.type === 'STOCK')
    const crypto = result.breakdown.find((b) => b.type === 'CRYPTO')
    expect(stock?.value).toBe(1000)
    expect(crypto?.value).toBe(1000)
    expect(stock?.percentage).toBe(50)
    expect(crypto?.percentage).toBe(50)
  })

  it('calcula percentuais em relação ao saldo total', () => {
    const result = calculateDiversification(
      [
        { type: 'STOCK', currentValue: 750 },
        { type: 'CRYPTO', currentValue: 250 },
      ],
      1000,
    )

    expect(result.breakdown[0]).toMatchObject({ type: 'STOCK', percentage: 75 })
    expect(result.breakdown[1]).toMatchObject({ type: 'CRYPTO', percentage: 25 })
  })

  it('utiliza rótulos amigáveis para os tipos', () => {
    const result = calculateDiversification([{ type: 'FIXED_INCOME', currentValue: 500 }], 500)
    expect(result.breakdown[0].label).toBe(TYPE_LABELS.FIXED_INCOME)
  })

  it('retorna breakdown vazio para portfólio sem posições', () => {
    const result = calculateDiversification([], 0)
    expect(result.breakdown).toEqual([])
    expect(result.totalBalance).toBe(0)
  })

  it('retorna percentual 0 quando o saldo total é zero', () => {
    const result = calculateDiversification([{ type: 'STOCK', currentValue: 500 }], 0)
    expect(result.breakdown[0].value).toBe(500)
    expect(result.breakdown[0].percentage).toBe(0)
  })

  it('ordena o breakdown por valor decrescente', () => {
    const result = calculateDiversification(
      [
        { type: 'FIXED_INCOME', currentValue: 100 },
        { type: 'STOCK', currentValue: 900 },
        { type: 'CRYPTO', currentValue: 500 },
      ],
      1500,
    )

    expect(result.breakdown.map((b) => b.value)).toEqual([900, 500, 100])
    expect(result.breakdown.map((b) => b.type)).toEqual(['STOCK', 'CRYPTO', 'FIXED_INCOME'])
  })
})