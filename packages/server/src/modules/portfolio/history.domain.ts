// @investpro/server
// Lógica pura do histórico de patrimônio (sem I/O): monta a série diária a
// partir das fotografias gravadas (PortfolioSnapshot), calcula a rentabilidade
// sem contar aportes/retiradas como ganho/perda e reconstrói o passado de
// contas anteriores à tabela a partir dos fluxos de caixa registrados.

export const HISTORY_TIME_ZONE = 'America/Sao_Paulo'

export interface SnapshotPoint {
  createdAt: Date
  equity: number
  netFlow: number
}

export interface HistoryPoint {
  date: string
  balance: number
  netFlow: number
}

const MONEY_EPSILON = 0.005

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Dia civil (AAAA-MM-DD) no fuso de São Paulo: o "dia" que o usuário enxerga. */
export function dayKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: HISTORY_TIME_ZONE })
}

function addDays(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Série diária de `days` dias até `now`: o valor de cada dia é a última
 * fotografia até o fim daquele dia (dias sem evento repetem o último valor);
 * netFlow soma os aportes/retiradas do dia. Dias anteriores à primeira
 * fotografia ficam de fora: não se inventa passado. O último ponto é o
 * patrimônio atual (`currentEquity`), que já inclui a variação de mercado.
 */
export function buildDailySeries(
  snapshots: ReadonlyArray<SnapshotPoint>,
  days: number,
  now: Date,
  currentEquity: number
): HistoryPoint[] {
  const sorted = [...snapshots].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  if (sorted.length === 0) return []

  const today = dayKey(now)
  const firstDay = addDays(today, -days)
  const flowByDay = new Map<string, number>()
  for (const snapshot of sorted) {
    const key = dayKey(snapshot.createdAt)
    flowByDay.set(key, (flowByDay.get(key) ?? 0) + snapshot.netFlow)
  }

  const series: HistoryPoint[] = []
  let cursor = 0
  let lastEquity: number | null = null

  for (let key = firstDay; key <= today; key = addDays(key, 1)) {
    while (cursor < sorted.length && dayKey(sorted[cursor].createdAt) <= key) {
      lastEquity = sorted[cursor].equity
      cursor++
    }
    if (lastEquity === null) continue
    series.push({
      date: key,
      balance: round2(key === today ? currentEquity : lastEquity),
      netFlow: round2(flowByDay.get(key) ?? 0),
    })
  }

  return series
}

/**
 * Retorno de cada dia descontando o fluxo do dia (aporte não é rendimento):
 * r = (V_hoje - fluxo_hoje) / V_ontem - 1. Dias com V_ontem <= 0 (conta ainda
 * vazia) não têm base de comparação e ficam de fora.
 */
export function flowAdjustedDailyReturns(series: ReadonlyArray<HistoryPoint>): number[] {
  const returns: number[] = []
  for (let i = 1; i < series.length; i++) {
    const previous = series[i - 1].balance
    if (previous <= MONEY_EPSILON) continue
    returns.push((series[i].balance - series[i].netFlow) / previous - 1)
  }
  return returns
}

/** Rentabilidade do período (time-weighted, em %), ou null sem base de comparação. */
export function timeWeightedReturnPct(series: ReadonlyArray<HistoryPoint>): number | null {
  const returns = flowAdjustedDailyReturns(series)
  if (returns.length === 0) return null
  const growth = returns.reduce((acc, r) => acc * (1 + r), 1)
  return Math.round((growth - 1) * 10000) / 100
}

export interface CashFlowEvent {
  createdAt: Date
  /** + entrou na plataforma (aporte), - saiu (transferência + tarifa). */
  amount: number
}

export interface BackfillPoint {
  createdAt: Date
  equity: number
  netFlow: number
}

/**
 * Reconstrói o patrimônio logo após cada aporte/transferência já registrado,
 * voltando no tempo a partir do patrimônio atual. Só considera fluxos de caixa
 * (não há preço histórico dos ativos), então é uma aproximação sem variação de
 * mercado. Se a conta tem saldo que não veio de nenhum aporte registrado (ex.:
 * conta de demonstração criada com saldo direto), a reconstrução ficaria
 * negativa em algum ponto: nesse caso devolve [] e o histórico começa agora.
 */
export function backfillFromCashFlows(
  currentEquity: number,
  events: ReadonlyArray<CashFlowEvent>
): BackfillPoint[] {
  const newestFirst = [...events].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const points: BackfillPoint[] = []
  let equityAfterEvent = currentEquity

  for (const event of newestFirst) {
    if (equityAfterEvent < -MONEY_EPSILON) return []
    points.push({ createdAt: event.createdAt, equity: round2(equityAfterEvent), netFlow: round2(event.amount) })
    equityAfterEvent -= event.amount
  }

  if (equityAfterEvent < -MONEY_EPSILON) return []
  return points.reverse()
}
