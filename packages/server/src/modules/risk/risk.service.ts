// @investpro/server
// Orquestra o cálculo de risco: obtém portfólio (posições) e série histórica de
// saldo, deriva os retornos diários e monta o riskReport no formato do contrato.
// Se o banco de dados estiver indisponível, lança erro controlado (503).

import type { RiskMetricItem, RiskReport } from '@investpro/shared'
import { AppError } from '../auth/auth.service.js'
import { getHistory, getPortfolio } from '../portfolio/portfolio.service.js'
import { flowAdjustedDailyReturns } from '../portfolio/history.domain.js'
import {
  annualizedVolatility,
  concentrationHhi,
  largestPositionWeight,
  maxDrawdown,
  riskScore,
  round4,
  sharpeRatio,
  varHistorical,
} from './risk.domain.js'

// ~3 semanas de dias com base de comparação: abaixo disso volatilidade, VaR e
// Sharpe anualizados viram ruído.
export const MIN_DAILY_RETURNS_FOR_RISK = 20

export async function getRiskReport(userId: string): Promise<RiskReport> {
  let portfolio
  let history

  try {
    portfolio = await getPortfolio(userId)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(
      'RISK_DATA_UNAVAILABLE',
      'Dados do portfólio indisponíveis no momento (banco de dados fora do ar)',
      503
    )
  }

  try {
    history = await getHistory(userId, { period: '90d' })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(
      'RISK_DATA_UNAVAILABLE',
      'Histórico de saldo indisponível no momento (banco de dados fora do ar)',
      503
    )
  }

  // Série real do patrimônio (PortfolioSnapshot). Os retornos descontam
  // aportes/retiradas do dia, e o drawdown é medido sobre o índice de
  // rentabilidade (uma transferência para fora não é "queda"). Com poucos
  // dias, as métricas de série não significam nada: o relatório avisa.
  const returns = flowAdjustedDailyReturns(history.history)
  const insufficientHistory = returns.length < MIN_DAILY_RETURNS_FOR_RISK
  const values = returns.reduce((index, r) => [...index, index[index.length - 1] * (1 + r)], [1])

  // Concentração a partir dos valores atuais das posições (getPortfolio).
  const weights = portfolio.positions.map((position) => position.currentValue)
  const hasPositions = portfolio.positions.length > 0
  const hhi = hasPositions ? concentrationHhi(weights) : null
  const largest = hasPositions ? largestPositionWeight(weights) : null

  const volatility = annualizedVolatility(returns)
  const var95 = varHistorical(returns, 0.95)
  const drawdown = maxDrawdown(values)
  const sharpe = sharpeRatio(returns)
  const score = riskScore({
    volatility,
    var95,
    maxDrawdown: drawdown,
    sharpe,
    concentration: hhi,
  })

  const metrics: RiskMetricItem[] = [
    {
      metric: 'VaR 95%',
      value: round4(var95),
      description: 'Perda potencial diária no percentil 5% dos retornos (proporção)',
    },
    {
      metric: 'Volatilidade anual',
      value: round4(volatility),
      description: 'Desvio padrão anualizado dos retornos diários (proporção)',
    },
    {
      metric: 'Drawdown máximo',
      value: round4(drawdown),
      description: 'Maior queda pico-a-vale no período observado (proporção)',
    },
    {
      metric: 'Sharpe',
      value: round4(sharpe),
      description: 'Excesso de retorno por unidade de risco, anualizado',
    },
  ]

  if (hhi !== null) {
    metrics.push({
      metric: 'Concentração (HHI)',
      value: round4(hhi),
      description: 'Índice Herfindahl-Hirschman das posições (0..1)',
    })
  }

  if (largest !== null) {
    metrics.push({
      metric: 'Maior posição',
      value: round4(largest),
      description: 'Peso relativo do maior ativo no portfólio (proporção)',
    })
  }

  return {
    var95: round4(var95),
    maxDrawdown: round4(drawdown),
    sharpe: round4(sharpe),
    volatility: round4(volatility),
    concentration: hhi !== null ? round4(hhi) : undefined,
    // Sem histórico, volatilidade/VaR zerados dariam uma nota "baixo risco" falsa.
    score: insufficientHistory ? undefined : score,
    insufficientHistory,
    historyDays: returns.length,
    updatedAt: new Date().toISOString(),
    metrics,
  }
}
