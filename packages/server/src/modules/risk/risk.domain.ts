// @investpro/server
// Lógica pura de métricas de risco do portfólio. Sem dependência de I/O ou DB.
// Todas as funções são determinísticas e testáveis isoladamente.

// Taxa livre de risco anual aproximada (SELIC ~10,5% a.a.) usada no Sharpe.
// Fonte: patamar de referência da taxa básica de juros; ajustável conforme
// política monetária vigente.
export const RISK_FREE_RATE_ANNUAL = 0.105

export const TRADING_DAYS_PER_YEAR = 252

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function mean(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

// Desvio padrão amostral (n-1).
export function stdDev(values: ReadonlyArray<number>): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance =
    values.reduce((acc, value) => acc + (value - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

// A partir de uma série de valores (ex.: saldo diário), deriva os retornos
// diários percentuais entre pontos consecutivos.
export function dailyReturnsFromValues(values: ReadonlyArray<number>): number[] {
  const returns: number[] = []
  for (let i = 1; i < values.length; i++) {
    const previous = values[i - 1]
    if (previous > 0) returns.push(values[i] / previous - 1)
  }
  return returns
}

export function sortAsc(values: ReadonlyArray<number>): number[] {
  return [...values].sort((a, b) => a - b)
}

// VaR 95% histórico: perda potencial (magnitude positiva, em proporção) no
// percentil 5% dos retornos. Ex.: 0.05 significa pior perda de ~5% do
// portfólio em 1 em cada 20 dias, na janela observada.
export function varHistorical(values: ReadonlyArray<number>, confidence = 0.95): number {
  if (values.length === 0) return 0
  const sorted = sortAsc(values)
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.floor((1 - confidence) * sorted.length))
  )
  return clamp(Math.abs(sorted[index]), 0, Number.MAX_SAFE_INTEGER)
}

// Maior queda pico-a-vale da série, em proporção (valor positivo).
// Ex.: 0.12 representa uma queda máxima de 12% em relação ao pico anterior.
export function maxDrawdown(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0
  let peak = values[0]
  let maximumDrawdown = 0
  for (const value of values) {
    if (value > peak) peak = value
    const drawdown = peak > 0 ? (peak - value) / peak : 0
    if (drawdown > maximumDrawdown) maximumDrawdown = drawdown
  }
  return maximumDrawdown
}

// Desvio padrão anualizado (proporção) a partir dos retornos diários.
export function annualizedVolatility(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0
  return stdDev(values) * Math.sqrt(TRADING_DAYS_PER_YEAR)
}

// Índice de Sharpe anualizado:
//   (retorno médio diário - taxa livre de risco diária) / desvio diário * sqrt(252)
export function sharpeRatio(
  values: ReadonlyArray<number>,
  riskFreeAnnual = RISK_FREE_RATE_ANNUAL
): number {
  if (values.length === 0) return 0
  const dailyRiskFree = riskFreeAnnual / TRADING_DAYS_PER_YEAR
  const excess = mean(values) - dailyRiskFree
  const deviation = stdDev(values)
  if (deviation === 0) return 0
  return (excess / deviation) * Math.sqrt(TRADING_DAYS_PER_YEAR)
}

// Índice Herfindahl-Hirschman (HHI) sobre os pesos das posições (0..1).
// Próximo de 1 = portfólio concentrado; menor = mais diversificado.
// O schema do contrato exige concentration >= 0, logo retornamos 0 quando vazio.
export function concentrationHhi(weights: ReadonlyArray<number>): number {
  if (weights.length === 0) return 0
  const total = weights.reduce((acc, weight) => acc + weight, 0)
  if (total <= 0) return 0
  return weights.reduce((acc, weight) => acc + (weight / total) ** 2, 0)
}

// Peso relativo do maior ativo (0..1). Complemento diagnóstico ao HHI.
export function largestPositionWeight(weights: ReadonlyArray<number>): number {
  if (weights.length === 0) return 0
  const total = weights.reduce((acc, weight) => acc + weight, 0)
  if (total <= 0) return 0
  return Math.max(...weights) / total
}

// Score linear para métricas em que "menor é melhor" (ex.: volatilidade).
// value <= good  → 100 ; value >= bad → 0 ; intermediários interpolação linear.
function lowerIsBetter(value: number, good: number, bad: number): number {
  if (value <= good) return 100
  if (value >= bad) return 0
  return ((bad - value) / (bad - good)) * 100
}

// Score linear para métricas em que "maior é melhor" (ex.: Sharpe).
// value >= good → 100 ; value <= bad → 0 ; intermediários interpolação linear.
function higherIsBetter(value: number, good: number, bad: number): number {
  if (value >= good) return 100
  if (value <= bad) return 0
  return ((value - bad) / (good - bad)) * 100
}

export interface RiskScoreInput {
  volatility: number
  var95: number
  maxDrawdown: number
  sharpe: number
  concentration: number | null
}

// Score de risco 0-100 determinístico (maior = menos risco, portfólio mais
// saudável). Média aritmética dos componentes disponíveis, cada um com regra
// linear de clamps:
//   - volatilidade anual:  <=15% → 100 ; >=50% → 0   (menor é melhor)
//   - VaR 95%:             <=4%  → 100 ; >=20% → 0   (menor é melhor)
//   - drawdown máximo:     <=8%  → 100 ; >=35% → 0   (menor é melhor)
//   - Sharpe:              >=1   → 100 ; <=-0.5 → 0  (maior é melhor)
//   - concentração (HHI):  <=0.15→ 100 ; >=0.6 → 0   (menor é melhor; quando há posições)
export function riskScore(input: RiskScoreInput): number {
  const parts: number[] = [
    lowerIsBetter(input.volatility, 0.15, 0.5),
    lowerIsBetter(input.var95, 0.04, 0.2),
    lowerIsBetter(input.maxDrawdown, 0.08, 0.35),
    higherIsBetter(input.sharpe, 1, -0.5),
  ]
  if (input.concentration !== null) {
    parts.push(lowerIsBetter(input.concentration, 0.15, 0.6))
  }

  if (parts.length === 0) return 0
  const average = parts.reduce((acc, part) => acc + part, 0) / parts.length
  return Math.round(clamp(average, 0, 100))
}

// Arredonda para 4 casas decimais nos outputs apresentados.
export function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}
