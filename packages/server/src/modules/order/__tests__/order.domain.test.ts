import { describe, expect, it } from 'vitest'
import type { CreateOrderInput } from '@investpro/shared'
import {
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