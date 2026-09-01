import { describe, expect, it } from 'vitest'
import { historyQuerySchema } from '../portfolio.schema.js'

describe('historyQuerySchema', () => {
  it('usa período padrão de 30 dias quando não informado', () => {
    const parsed = historyQuerySchema.parse({})
    expect(parsed.period).toBe('30d')
  })

  it('aceita todos os períodos válidos', () => {
    for (const period of ['7d', '30d', '90d', '1y']) {
      expect(historyQuerySchema.safeParse({ period }).success).toBe(true)
    }
  })

  it('rejeita períodos inválidos', () => {
    expect(historyQuerySchema.safeParse({ period: '3d' }).success).toBe(false)
    expect(historyQuerySchema.safeParse({ period: '2y' }).success).toBe(false)
    expect(historyQuerySchema.safeParse({ period: 'ano' }).success).toBe(false)
  })
})