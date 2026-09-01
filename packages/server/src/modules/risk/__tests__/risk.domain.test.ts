import { describe, expect, it } from 'vitest'
import {
  annualizedVolatility,
  concentrationHhi,
  dailyReturnsFromValues,
  largestPositionWeight,
  maxDrawdown,
  mean,
  riskScore,
  round4,
  sharpeRatio,
  stdDev,
  varHistorical,
} from '../risk.domain.js'

describe('stats básicas', () => {
  it('mean e stdDev de amostra', () => {
    expect(mean([2, 4, 4, 4, 5, 5, 7, 9])).toBe(5)
    expect(stdDev([])).toBe(0)
    expect(stdDev([5])).toBe(0)
  })

  it('stdDev usa variância amostral (n-1)', () => {
    expect(stdDev([1, 2, 3])).toBeCloseTo(1)
  })
})

describe('dailyReturnsFromValues', () => {
  it('deriva retornos percentuais entre pontos', () => {
    const returns = dailyReturnsFromValues([100, 110, 110])
    expect(returns).toHaveLength(2)
    expect(returns[0]).toBeCloseTo(0.1)
    expect(returns[1]).toBe(0)
  })

  it('iguala a -1 quando o valor cai a zero e ignora denominador nulo', () => {
    expect(dailyReturnsFromValues([100, 0, 100])).toEqual([-1])
  })
})

describe('varHistorical', () => {
  it('retorna perda no percentil 5% (magnitude positiva)', () => {
    const returns = [-0.1, -0.05, 0, 0.02, 0.03, 0.01, 0.04, -0.02, 0.005, 0.01]
    const var95 = varHistorical(returns, 0.95)
    expect(var95).toBeGreaterThan(0)
    expect(var95).toBeLessThanOrEqual(0.1)
  })

  it('retorna 0 para série vazia', () => {
    expect(varHistorical([], 0.95)).toBe(0)
  })

  it('valor no pior caso quando quase todo retorno é negativo', () => {
    const returns = [-0.01, -0.02, -0.03, -0.04, -0.05]
    const var95 = varHistorical(returns, 0.95)
    expect(var95).toBe(0.05)
  })
})

describe('maxDrawdown', () => {
  it('calcula a maior queda pico-a-vale', () => {
    const values = [100, 120, 90, 110, 80, 85]
    const mdd = maxDrawdown(values)
    expect(mdd).toBeCloseTo(1 / 3) // 120 -> 80 (33,33%)
  })

  it('retorna 0 em série monotonicamente crescente', () => {
    expect(maxDrawdown([100, 105, 110])).toBe(0)
  })

  it('retorna 0 em série vazia', () => {
    expect(maxDrawdown([])).toBe(0)
  })
})

describe('annualizedVolatility', () => {
  it('anualiza o desvio padrão diário por sqrt(252)', () => {
    const daily = 0.01
    const vol = annualizedVolatility([daily, -daily, daily, -daily, daily, -daily])
    expect(vol).toBeGreaterThan(0)
    // placeholder: apenas assegura escala anual >> diária
    expect(vol).toBeGreaterThan(daily)
  })

  it('retorna 0 para série vazia', () => {
    expect(annualizedVolatility([])).toBe(0)
  })
})

describe('sharpeRatio', () => {
  it('é positivo quando retorno excede a taxa livre', () => {
    const returns = Array<number>(30).fill(0.01)
    expect(sharpeRatio(returns)).toBeGreaterThan(0)
  })

  it('retorna 0 para série vazia ou desvio zero', () => {
    expect(sharpeRatio([])).toBe(0)
    expect(sharpeRatio([0.01, 0.01, 0.01])).toBe(0)
  })
})

describe('concentração', () => {
  it('HHI de um único ativo é 1', () => {
    expect(concentrationHhi([100])).toBe(1)
  })

  it('HHI com pesos iguais diminui com mais ativos', () => {
    expect(concentrationHhi([50, 50])).toBeCloseTo(0.5)
    expect(concentrationHhi([100 / 3, 100 / 3, 100 / 3])).toBeCloseTo(1 / 3)
  })

  it('HHI de série vazia é 0', () => {
    expect(concentrationHhi([])).toBe(0)
  })

  it('largestPositionWeight retorna a maior participação', () => {
    expect(largestPositionWeight([10, 30, 60])).toBeCloseTo(0.6)
    expect(largestPositionWeight([])).toBe(0)
  })
})

describe('riskScore', () => {
  it('portfólio de baixo risco pontua alto', () => {
    const score = riskScore({
      volatility: 0.05,
      var95: 0.02,
      maxDrawdown: 0.05,
      sharpe: 1.5,
      concentration: 0.1,
    })
    expect(score).toBeGreaterThanOrEqual(80)
  })

  it('portfólio de alto risco pontua baixo', () => {
    const score = riskScore({
      volatility: 0.6,
      var95: 0.25,
      maxDrawdown: 0.45,
      sharpe: -1,
      concentration: 0.8,
    })
    expect(score).toBeLessThanOrEqual(20)
  })

  it('fica dentro de 0-100', () => {
    const extremes = [0.05, 0.05, 0.05, 0.05, 0.4, 1.5, -1]
    for (const value of extremes) {
      const score = riskScore({
        volatility: value,
        var95: value,
        maxDrawdown: value,
        sharpe: value,
        concentration: value,
      })
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    }
  })

  it('ignora concentração nula', () => {
    const withConc = riskScore({
      volatility: 0.1,
      var95: 0.03,
      maxDrawdown: 0.05,
      sharpe: 1,
      concentration: 0.6,
    })
    const withoutConc = riskScore({
      volatility: 0.1,
      var95: 0.03,
      maxDrawdown: 0.05,
      sharpe: 1,
      concentration: null,
    })
    expect(withConc).not.toBe(withoutConc)
  })
})

describe('round4', () => {
  it('arredonda para 4 casas', () => {
    expect(round4(0.123456)).toBe(0.1235)
  })
})