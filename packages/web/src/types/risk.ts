export interface RiskMetricItem {
  metric: string;
  value: number;
  description?: string;
}

export interface RiskReport {
  var95: number;
  maxDrawdown: number;
  sharpe: number;
  volatility: number;
  concentration?: number;
  score?: number;
  updatedAt: string;
  metrics?: RiskMetricItem[];
}
