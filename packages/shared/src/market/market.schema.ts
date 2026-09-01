// @investpro/shared
// Contratos de mercado (cotação de ativos). Base para WI-205.

import { z } from 'zod';
import { ASSET_TYPES } from '../types/enums.js';

export const assetSchema = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string(),
  type: z.enum(ASSET_TYPES),
  price: z.number().nonnegative(),
  change24h: z.number(),
  changePercent: z.number().optional(),
});

export const quoteSchema = z.object({
  ticker: z.string(),
  price: z.number().nonnegative(),
  change: z.number(),
  changePercent: z.number().optional(),
  volume: z.number().nonnegative().optional(),
});

export const assetQuerySchema = z.object({
  type: z.enum(ASSET_TYPES).optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const assetListSchema = z.object({
  items: z.array(assetSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export const priceHistoryPointSchema = z.object({
  timestamp: z.string(),
  price: z.number().nonnegative(),
});

export const priceHistoryQuerySchema = z.object({
  ticker: z.string().min(1),
  interval: z.enum(['1d', '1w', '1m']).default('1d'),
  limit: z.number().int().positive().max(500).default(30),
});

export const priceHistorySchema = z.object({
  ticker: z.string(),
  points: z.array(priceHistoryPointSchema),
});

export type Asset = z.infer<typeof assetSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type AssetQuery = z.infer<typeof assetQuerySchema>;
export type AssetList = z.infer<typeof assetListSchema>;
export type PriceHistoryPoint = z.infer<typeof priceHistoryPointSchema>;
export type PriceHistoryQuery = z.infer<typeof priceHistoryQuerySchema>;
export type PriceHistory = z.infer<typeof priceHistorySchema>;