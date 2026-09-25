import { describe, expect, it } from 'vitest'
import {
  backfillFromCashFlows,
  buildIntradaySeries,
  buildDailySeries,
  dayKey,
  flowAdjustedDailyReturns,
  timeWeightedReturnPct,
} from '../history.domain.js'

// Meio-dia em São Paulo (15h UTC): longe da virada de dia nos dois fusos.
const NOW = new Date('2026-09-25T15:00:00Z')
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)

describe('dayKey', () => {
  it('usa o dia civil de São Paulo (22h em SP ainda é o mesmo dia, 01h UTC do dia seguinte)', () => {
    expect(dayKey(new Date('2026-09-26T01:00:00Z'))).toBe('2026-09-25')
  })
})

describe('buildDailySeries', () => {
  it('mantém o passado: cada dia usa a última fotografia até ele, e só hoje reflete o patrimônio atual', () => {
    const snapshots = [
      { createdAt: daysAgo(3), equity: 1000, netFlow: 1000 },
      { createdAt: daysAgo(2), equity: 1100, netFlow: 0 },
    ]

    const series = buildDailySeries(snapshots, 7, NOW, 1600)

    expect(series).toEqual([
      { date: '2026-09-22', balance: 1000, netFlow: 1000 },
      { date: '2026-09-23', balance: 1100, netFlow: 0 },
      { date: '2026-09-24', balance: 1100, netFlow: 0 },
      { date: '2026-09-25', balance: 1600, netFlow: 0 },
    ])
  })

  it('não inventa dias antes da primeira fotografia', () => {
    expect(buildDailySeries([], 30, NOW, 500)).toEqual([])
    expect(buildDailySeries([{ createdAt: NOW, equity: 500, netFlow: 0 }], 30, NOW, 500)).toHaveLength(1)
  })

  it('soma os fluxos de vários eventos no mesmo dia e usa o último valor do dia', () => {
    const series = buildDailySeries(
      [
        { createdAt: daysAgo(1), equity: 500, netFlow: 500 },
        { createdAt: new Date(daysAgo(1).getTime() + 60_000), equity: 300, netFlow: -200 },
      ],
      7,
      NOW,
      300
    )
    expect(series[0]).toEqual({ date: '2026-09-24', balance: 300, netFlow: 300 })
  })

  it('fotografia anterior à janela define o valor inicial', () => {
    const series = buildDailySeries([{ createdAt: daysAgo(40), equity: 800, netFlow: 0 }], 7, NOW, 800)
    expect(series).toHaveLength(8)
    expect(series.every((point) => point.balance === 800)).toBe(true)
  })
})

describe('rentabilidade sem contar aportes', () => {
  const series = [
    { date: 'd1', balance: 1000, netFlow: 1000 },
    { date: 'd2', balance: 1100, netFlow: 0 },
    { date: 'd3', balance: 1100, netFlow: 0 },
    { date: 'd4', balance: 1600, netFlow: 500 },
  ]

  it('aporte de 500 não conta como ganho: retornos diários 10%, 0%, 0%', () => {
    const returns = flowAdjustedDailyReturns(series)
    expect(returns.map((r) => Math.round(r * 1e6) / 1e6)).toEqual([0.1, 0, 0])
  })

  it('rentabilidade do período = 10%, não os 60% de (1600-1000)/1000', () => {
    expect(timeWeightedReturnPct(series)).toBe(10)
  })

  it('transferência para fora não vira prejuízo', () => {
    const withWithdrawal = [
      { date: 'd1', balance: 1000, netFlow: 0 },
      { date: 'd2', balance: 700, netFlow: -300 },
    ]
    expect(timeWeightedReturnPct(withWithdrawal)).toBe(0)
  })

  it('sem base de comparação (1 ponto ou conta vazia) é null', () => {
    expect(timeWeightedReturnPct([{ date: 'd1', balance: 1000, netFlow: 1000 }])).toBeNull()
    expect(
      timeWeightedReturnPct([
        { date: 'd1', balance: 0, netFlow: 0 },
        { date: 'd2', balance: 500, netFlow: 500 },
      ])
    ).toBeNull()
  })
})

describe('backfillFromCashFlows', () => {
  it('reconstrói o patrimônio logo após cada aporte/transferência, do atual para trás', () => {
    const points = backfillFromCashFlows(700, [
      { createdAt: daysAgo(5), amount: 1000 },
      { createdAt: daysAgo(2), amount: -300 },
    ])
    expect(points).toEqual([
      { createdAt: daysAgo(5), equity: 1000, netFlow: 1000 },
      { createdAt: daysAgo(2), equity: 700, netFlow: -300 },
    ])
  })

  it('saldo que não veio de aporte registrado (ex.: conta demo) aparece como ponto de partida, sem ficar negativo', () => {
    const points = backfillFromCashFlows(100_500, [{ createdAt: daysAgo(3), amount: 500 }])
    expect(points).toEqual([{ createdAt: daysAgo(3), equity: 100_500, netFlow: 500 }])
  })

  it('se a reconstrução ficaria negativa, não inventa: devolve vazio', () => {
    expect(backfillFromCashFlows(100, [{ createdAt: daysAgo(3), amount: 500 }])).toEqual([])
  })
})

describe('buildIntradaySeries (1º dia da conta)', () => {
  it('fotografias de hoje em ordem + o patrimônio atual: dá linha já no primeiro dia', () => {
    const snapshots = [
      { createdAt: new Date('2026-09-25T13:00:00Z'), equity: 1000, netFlow: 1000 },
      { createdAt: new Date('2026-09-25T12:00:00Z'), equity: 0, netFlow: 0 },
      { createdAt: daysAgo(3), equity: 50, netFlow: 0 },
    ]
    expect(buildIntradaySeries(snapshots, NOW, 1200)).toEqual([
      { at: '2026-09-25T12:00:00.000Z', balance: 0 },
      { at: '2026-09-25T13:00:00.000Z', balance: 1000 },
      { at: NOW.toISOString(), balance: 1200 },
    ])
  })

  it('sem fotografia hoje: só o ponto atual (a tela mostra o aviso, sem linha)', () => {
    expect(buildIntradaySeries([], NOW, 500)).toEqual([{ at: NOW.toISOString(), balance: 500 }])
  })
})
