// @investpro/server
// Orquestra o cálculo de risco: obtém portfólio (posições) e série histórica de
// saldo, deriva os retornos diários e monta o riskReport no formato do contrato.
// Se o banco de dados estiver indisponível, lança erro controlado (503).

import type { RiskMetricItem, RiskReport } from '@investpro/shared'
import { AppError } from '../auth/auth.service.js'
import { getHistory, getPortfolio } from '../portfolio/portfolio.service.js'
import {
  annualizedVolatility,
  concentrationHhi,
  dailyReturnsFromValues,
  largestPositionWeight,
  maxDrawdown,
  riskScore,
  round4,
  sharpeRatio,
  varHistorical,
} from './risk.domain.js'

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

  // Série de valores diários de saldo começa no histórico determinístico do
  // portfólio (getHistory). Sem persistência dedicada de risco, usamos essa
  // série como proxy para derivar os retornos.
  const values = history.history.map((entry) => entry.balance)
  const returns = dailyReturnsFromValues(values)

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
    score,
    updatedAt: new Date().toISOString(),
    metrics,
  }
}
