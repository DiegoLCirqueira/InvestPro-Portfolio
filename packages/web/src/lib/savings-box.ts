import { formatPercent } from "@/lib/format";

// A Caixinha tem página própria. Recomendações, Nova Ordem e quem quiser linkar para ela usam
// este caminho.
export const SAVINGS_BOX_PATH = "/caixinha";

// Âncora de quando ela morava em Ordens (/orders#caixinha) e depois no Painel (/#caixinha):
// quem salvou esses links é redirecionado para a página.
export const LEGACY_SAVINGS_BOX_HASH = "#caixinha";

/** Períodos do simulador "Quanto rende", em meses. */
export const SIMULATION_MONTHS = [1, 6, 12] as const;
export type SimulationMonths = (typeof SIMULATION_MONTHS)[number];

const roundCents = (value: number) => Math.round(value * 100) / 100;

/**
 * Rendimento em juros simples (taxa anual × meses / 12), a mesma regra da Caixinha do servidor.
 * É simulação: o saldo da Caixinha não cresce sozinho.
 */
export function simulateYield(amount: number, annualRate: number, months: number) {
  return roundCents((amount * annualRate * months) / 12);
}

/** Quanto do dinheiro livre (Caixinha + saldo em conta livre) está na Caixinha, em % (0 a 100). */
export function savingsShare(savings: number, freeAccount: number) {
  const total = savings + freeAccount;
  return total > 0 ? (savings / total) * 100 : 0;
}

/**
 * % inteiro para a barra "Seu dinheiro livre", sem chegar a 100% ou 0% por arredondamento:
 * "100% rendendo" com dinheiro ainda parado em conta (99,86%) dizia que não havia nada a fazer.
 */
export function formatSavingsShare(share: number) {
  if (share > 99 && share < 100) return `mais de ${formatPercent(99, { decimals: 0 })}`;
  if (share > 0 && share < 1) return `menos de ${formatPercent(1, { decimals: 0 })}`;
  return formatPercent(Math.round(share), { decimals: 0 });
}

// Valor inicial do simulador: o que já está guardado; sem isso, o que dá para guardar (até
// R$ 1.000, para não sugerir esvaziar a conta); sem nenhum dos dois, R$ 1.000 de exemplo.
const DEFAULT_SIMULATION_AMOUNT = 1_000;
export function initialSimulationAmount(savings: number, freeAccount: number) {
  if (savings > 0) return savings;
  if (freeAccount > 0) return Math.min(freeAccount, DEFAULT_SIMULATION_AMOUNT);
  return DEFAULT_SIMULATION_AMOUNT;
}
