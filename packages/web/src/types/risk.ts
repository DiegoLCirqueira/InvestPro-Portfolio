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
  /** true enquanto o histórico real do patrimônio tem poucos dias para as métricas de série. */
  insufficientHistory?: boolean;
  historyDays?: number;
  updatedAt: string;
  metrics?: RiskMetricItem[];
}
