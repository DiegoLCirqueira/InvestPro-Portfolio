import type { PortfolioHistoryPoint } from "@/types/portfolio";

/**
 * Ganho do período em R$, sem contar aportes e retiradas: a variação do patrimônio menos o
 * que entrou/saiu (netFlow) depois do primeiro dia. Sem isso, um depósito de R$ 10 apareceria
 * como R$ 10 de rendimento. Null sem base de comparação (menos de 2 dias).
 */
export function periodGain(history: ReadonlyArray<PortfolioHistoryPoint>): number | null {
  if (history.length < 2) return null;
  const first = history[0];
  const last = history[history.length - 1];
  const flows = history.slice(1).reduce((sum, point) => sum + point.netFlow, 0);
  return Math.round((last.balance - first.balance - flows) * 100) / 100;
}
