import { describe, expect, it } from 'vitest'
import type { CreateOrderInput } from '@investpro/shared'
import {
  applyBuyFill,
  applySellFill,
  canSell,
  computeTotal,
  evaluateOrder,
  isExecutableAt,
  newAveragePrice,
  requiresPrice,
  resolveAsset,
  validateOrder,
} from '../order.domain.js'

function baseOrder(overrides: Partial<CreateOrderInput> = {}): CreateOrderInput {
  return {
    ticker: 'PETR4',
    side: 'BUY',
    quantity: 10,
    type: 'MARKET',
    ...overrides,
  }
}

describe('requiresPrice', () => {
  it('LIMIT e STOP exigem preço', () => {
    expect(requiresPrice('MARKET')).toBe(false)
    expect(requiresPrice('LIMIT')).toBe(true)
    expect(requiresPrice('STOP')).toBe(true)
  })
})

describe('validateOrder', () => {
  it('válida ordem market sem erros', () => {
    expect(validateOrder(baseOrder())).toEqual([])
  })

  it('erro sem assetId e sem ticker', () => {
    expect(validateOrder(baseOrder({ ticker: undefined, assetId: undefined }))).toContain(
      'Informe assetId ou ticker'
    )
  })

  it('erro de quantidade não positiva', () => {
    expect(validateOrder(baseOrder({ quantity: 0 }))).toContain(
      'Quantidade deve ser positiva'
    )
  })

  it('LIMIT/STOP sem preço gera erro', () => {
    expect(validateOrder(baseOrder({ type: 'LIMIT' }))).toContain(
      'Ordens LIMIT/STOP exigem preço positivo'
    )
    expect(validateOrder(baseOrder({ type: 'STOP' }))).toHaveLength(1)
  })
})

describe('resolveAsset', () => {
  it('usa o ticker fornecido e normaliza maiúsculas', () => {
    expect(resolveAsset({ ticker: 'petr4' })).toEqual({
      ticker: 'PETR4',
      assetId: null,
    })
  })

  it('resolve assetId via lookup', () => {
    const lookup = (key: string) =>
      key === 'abc' ? { ticker: 'VALE3', assetId: 'abc' } : null
    expect(resolveAsset({ assetId: 'abc', ticker: undefined }, lookup)).toEqual({
      ticker: 'VALE3',
      assetId: 'abc',
    })
  })

  it('lança erro sem identificador', () => {
    expect(() => resolveAsset({})).toThrow('Informe assetId ou ticker')
  })
})

describe('evaluateOrder', () => {
  it('MARKET executa no preço atual', () => {
    const evaluation = evaluateOrder(baseOrder(), 25)
    expect(evaluation).toEqual({ status: 'FILLED', fillPrice: 25, total: 250 })
  })

  it('LIMIT de compra executa quando mercado <= limite', () => {
    const evaluation = evaluateOrder(baseOrder({ type: 'LIMIT', price: 30 }), 25)
    expect(evaluation.status).toBe('FILLED')
    expect(evaluation.fillPrice).toBe(30)
  })

  it('LIMIT de compra fica OPEN quando mercado acima do limite', () => {
    const evaluation = evaluateOrder(baseOrder({ type: 'LIMIT', price: 20 }), 25)
    expect(evaluation.status).toBe('OPEN')
    expect(evaluation.fillPrice).toBeNull()
  })

  it('LIMIT de venda executa quando mercado >= limite', () => {
    const evaluation = evaluateOrder(
      baseOrder({ side: 'SELL', type: 'LIMIT', price: 20 }),
      25
    )
    expect(evaluation.status).toBe('FILLED')
  })

  it('STOP de compra executa quando mercado cruza o gatilho para cima', () => {
    const evaluation = evaluateOrder(
      baseOrder({ type: 'STOP', price: 30 }),
      32
    )
    expect(evaluation.status).toBe('FILLED')
  })
})

describe('newAveragePrice', () => {
  it('calcula média ponderada', () => {
    expect(newAveragePrice(20, 10, 10, 30)).toBe(25)
  })

  it('sem posição existente retorna o preço do fill', () => {
    expect(newAveragePrice(undefined, 0, 5, 40)).toBe(40)
  })
})

describe('computeTotal', () => {
  it('multiplica quantidade pelo preço', () => {
    expect(computeTotal(10, 25.5)).toBe(255)
  })
})

describe('applyBuyFill', () => {
  it('sem posição prévia: avgPrice é o próprio preço do fill', () => {
    const result = applyBuyFill(null, 10, 25)
    expect(result).toEqual({ quantity: 10, avgPrice: 25, currentValue: 250 })
  })

  it('com posição prévia: recalcula a média ponderada', () => {
    // (20*10 + 30*10) / 20 = 25
    const result = applyBuyFill({ quantity: 10, avgPrice: 20 }, 10, 30)
    expect(result).toEqual({ quantity: 20, avgPrice: 25, currentValue: 500 })
  })
})

describe('canSell', () => {
  it('sem posição existente: não pode vender', () => {
    expect(canSell(null, 5)).toBe(false)
  })

  it('posição insuficiente: não pode vender', () => {
    expect(canSell({ quantity: 5, avgPrice: 10 }, 10)).toBe(false)
  })

  it('posição suficiente (inclusive igualdade exata): pode vender', () => {
    expect(canSell({ quantity: 10, avgPrice: 10 }, 10)).toBe(true)
    expect(canSell({ quantity: 10, avgPrice: 10 }, 4)).toBe(true)
  })
})

describe('applySellFill', () => {
  it('venda parcial: mantém avgPrice e reduz quantity/currentValue', () => {
    const result = applySellFill({ quantity: 10, avgPrice: 20 }, 4)
    expect(result).toEqual({ quantity: 6, avgPrice: 20, currentValue: 120 })
  })

  it('venda que zera a posição exatamente: retorna null', () => {
    expect(applySellFill({ quantity: 10, avgPrice: 20 }, 10)).toBeNull()
  })

  it('tolerância de ponto flutuante: resíduo ínfimo (<=1e-8) é tratado como posição zerada', () => {
    // 0.1 + 0.2 = 0.30000000000000004 em IEEE754; o resíduo contra 0.3 é ~4.44e-17.
    const current = { quantity: 0.1 + 0.2, avgPrice: 20 }
    expect(applySellFill(current, 0.3)).toBeNull()
  })

  it('resíduo acima da tolerância não é tratado como zerado', () => {
    const result = applySellFill({ quantity: 10.00000002, avgPrice: 20 }, 10)
    expect(result).not.toBeNull()
    expect(result?.quantity).toBeCloseTo(2e-8, 10)
  })
})