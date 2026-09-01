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
  balance: number;
  positions: PortfolioPosition[];
}

export interface PortfolioHistoryPoint {
  date: string;
  balance: number;
}

export interface PortfolioHistoryResponse {
  history: PortfolioHistoryPoint[];
}

export interface PortfolioDiversificationItem {
  type: PortfolioAssetType;
  label: string;
  value: number;
  percentage: number;
}

export interface PortfolioDiversificationResponse {
  totalBalance: number;
  breakdown: PortfolioDiversificationItem[];
}
