// @investpro/shared
// Contratos de portfólio. Espelham packages/server/src/modules/portfolio/portfolio.schema.ts.

import { z } from 'zod';
import { ASSET_TYPES, PORTFOLIO_PERIODS } from '../types/enums.js';

export const historyQuerySchema = z.object({
  period: z.enum(PORTFOLIO_PERIODS).default('30d'),
});

export const positionSchema = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string(),
  type: z.enum(ASSET_TYPES),
  quantity: z.number(),
  avgPrice: z.number(),
  currentValue: z.number(),
});

export const portfolioResponseSchema = z.object({
  id: z.string(),
  balance: z.number(),
  positions: z.array(positionSchema),
});

export const historyPointSchema = z.object({
  date: z.string(),
  balance: z.number(),
});

export const historyResponseSchema = z.object({
  history: z.array(historyPointSchema),
});

export const diversificationItemSchema = z.object({
  type: z.enum(ASSET_TYPES),
  label: z.string(),
  value: z.number(),
  percentage: z.number(),
});

export const diversificationResponseSchema = z.object({
  totalBalance: z.number(),
  breakdown: z.array(diversificationItemSchema),
});

export type PortfolioPeriod = (typeof PORTFOLIO_PERIODS)[number];
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type Position = z.infer<typeof positionSchema>;
export type PortfolioResponse = z.infer<typeof portfolioResponseSchema>;
export type HistoryPoint = z.infer<typeof historyPointSchema>;
export type HistoryResponse = z.infer<typeof historyResponseSchema>;
export type DiversificationItem = z.infer<typeof diversificationItemSchema>;
export type DiversificationResponse = z.infer<typeof diversificationResponseSchema>;