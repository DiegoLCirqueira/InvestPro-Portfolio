import { z } from 'zod'

export const historyQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
})

export const positionSchema = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string(),
  type: z.enum(['CRYPTO', 'STOCK', 'FIXED_INCOME']),
  quantity: z.number(),
  avgPrice: z.number(),
  currentValue: z.number(),
})

export const portfolioResponseSchema = z.object({
  id: z.string(),
  balance: z.number(),
  positions: z.array(positionSchema),
})

export const historyPointSchema = z.object({
  date: z.string(),
  balance: z.number(),
})

export const historyResponseSchema = z.object({
  history: z.array(historyPointSchema),
})

export const diversificationItemSchema = z.object({
  type: z.enum(['CRYPTO', 'STOCK', 'FIXED_INCOME']),
  label: z.string(),
  value: z.number(),
  percentage: z.number(),
})

export const diversificationResponseSchema = z.object({
  totalBalance: z.number(),
  breakdown: z.array(diversificationItemSchema),
})

export type HistoryQuery = z.infer<typeof historyQuerySchema>
