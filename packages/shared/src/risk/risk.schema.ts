// @investpro/shared
// Contratos de risco do portfólio. Base para WI-218.

import { z } from 'zod';

export const riskMetricItemSchema = z.object({
  metric: z.string(),
  value: z.number(),
  description: z.string().optional(),
});

export const riskReportSchema = z.object({
  var95: z.number(),
  maxDrawdown: z.number(),
  sharpe: z.number(),
  volatility: z.number(),
  concentration: z.number().nonnegative().optional(),
  score: z.number().min(0).max(100).optional(),
  updatedAt: z.string(),
  metrics: z.array(riskMetricItemSchema).optional(),
});

export const riskReportListSchema = z.object({
  items: z.array(riskReportSchema),
  updatedAt: z.string(),
});

export type RiskMetricItem = z.infer<typeof riskMetricItemSchema>;
export type RiskReport = z.infer<typeof riskReportSchema>;
export type RiskReportList = z.infer<typeof riskReportListSchema>;