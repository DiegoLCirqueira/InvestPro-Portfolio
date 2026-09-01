// @investpro/shared
// Contratos de ordens (compra/venda de ativos). Base para WI-208.

import { z } from 'zod';
import { ORDER_SIDES, ORDER_STATUSES, ORDER_TYPES } from '../types/enums.js';

export const createOrderInputSchema = z
  .object({
    assetId: z.string().min(1).optional(),
    ticker: z.string().min(1).optional(),
    side: z.enum(ORDER_SIDES),
    quantity: z.number().positive(),
    price: z.number().positive().optional(),
    type: z.enum(ORDER_TYPES).default('MARKET'),
  })
  .refine((data) => data.assetId || data.ticker, {
    message: 'Informe assetId ou ticker',
  });

export const orderSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  ticker: z.string(),
  side: z.enum(ORDER_SIDES),
  type: z.enum(ORDER_TYPES),
  quantity: z.number().positive(),
  price: z.number().nonnegative().nullable().optional(),
  status: z.enum(ORDER_STATUSES),
  createdAt: z.string(),
  executedAt: z.string().nullable().optional(),
  avgPrice: z.number().nonnegative().nullable().optional(),
});

export const orderListSchema = z.object({
  items: z.array(orderSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderList = z.infer<typeof orderListSchema>;