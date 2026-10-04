export const PORTFOLIO_PERIODS = ["7d", "30d", "90d", "1y"] as const;

export type PortfolioPeriod = (typeof PORTFOLIO_PERIODS)[number];

export type PortfolioAssetType = "CRYPTO" | "STOCK" | "FIXED_INCOME";

export interface PortfolioPosition {
  id: string;
  ticker: string;
  name: string;
  type: PortfolioAssetType;
  quantity: number;
  avgPrice: number;
  currentValue: number;
}

export interface PortfolioResponse {
  id: string;
  /** Saldo em caixa (disponível para ordens/transferências). */
  balance: number;
  /** Patrimônio total: caixa + posições + Caixinha + moedas em BRL. */
  totalEquity: number;
  positions: PortfolioPosition[];
}

// balance = patrimônio total do dia; netFlow = aportes (+) e retiradas (-) do dia.
export interface PortfolioHistoryPoint {
  date: string;
  balance: number;
  netFlow: number;
}

export interface PortfolioIntradayPoint {
  at: string;
  balance: number;
}

export interface PortfolioHistoryResponse {
  history: PortfolioHistoryPoint[];
  /** Só no 1º dia da conta: evolução dentro do dia. */
  intraday: PortfolioIntradayPoint[];
  /** Rentabilidade do período em %, sem contar aportes; null sem base de comparação. */
  returnPct: number | null;
}

/** Fatias da diversificação: tipos de ativo + moedas estrangeiras (câmbio, em BRL). */
export type DiversificationCategory = PortfolioAssetType | "FOREIGN_CURRENCY";

export interface PortfolioDiversificationItem {
  type: DiversificationCategory;
  label: string;
  value: number;
  percentage: number;
}

export interface PortfolioDiversificationResponse {
  totalBalance: number;
  breakdown: PortfolioDiversificationItem[];
}
