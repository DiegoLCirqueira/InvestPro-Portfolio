import { describe, expect, it } from 'vitest'
import { estimateSimpleYield, SAVINGS_BOX_ANNUAL_RATE } from '../savings-box.domain.js'

describe('estimateSimpleYield', () => {
  it('calcula juros simples proporcional ao tempo decorrido', () => {
    expect(SAVINGS_BOX_ANNUAL_RATE).toBe(0.06)
    // 1000 * 0.06 * (365/365) = 60
    expect(estimateSimpleYield(1000, 365)).toBeCloseTo(60, 8)
    // meio ano: metade do rendimento anual
    expect(estimateSimpleYield(1000, 182.5)).toBeCloseTo(30, 8)
  })

  it('sem saldo ou sem tempo decorrido: rendimento zero', () => {
    expect(estimateSimpleYield(0, 365)).toBe(0)
    expect(estimateSimpleYield(1000, 0)).toBe(0)
    expect(estimateSimpleYield(-100, 365)).toBe(0)
  })

  it('aceita uma taxa customizada', () => {
    expect(estimateSimpleYield(1000, 365, 0.1)).toBeCloseTo(100, 8)
  })
})
