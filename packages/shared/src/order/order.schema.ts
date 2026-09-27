// @investpro/shared
// Contratos de ordens (compra/venda de ativos). Base para WI-208.

import { z } from 'zod';
import { ASSET_TYPES, ORDER_SIDES, ORDER_STATUSES, ORDER_TYPES } from '../types/enums.js';
import { hasAtMostDecimalPlaces } from '../types/decimal.js';
import { moneyAmountSchema } from '../types/money.js';

// Position.quantity/Order.quantity são Decimal(15,8): 8 casas e 7 dígitos inteiros.
export const ORDER_QUANTITY_DECIMAL_PLACES = 8;
export const MAX_ORDER_QUANTITY = 9_999_999;

export const orderQuantityInputSchema = z
  .number()
  .positive()
  .max(MAX_ORDER_QUANTITY, { message: 'Quantidade acima do máximo permitido' })
  .refine((value) => hasAtMostDecimalPlaces(value, ORDER_QUANTITY_DECIMAL_PLACES), {
    message: `Quantidade deve ter no máximo ${ORDER_QUANTITY_DECIMAL_PLACES} casas decimais`,
  });

// Ações e renda fixa são negociadas em unidades inteiras; só cripto aceita fração (0,001 BTC).
// Vale para a compra: a venda aceita a posição inteira, mesmo que fracionada por compras antigas.
const WHOLE_QUANTITY_ASSET_TYPES: readonly (typeof ASSET_TYPES)[number][] = ['STOCK', 'FIXED_INCOME'];
export const WHOLE_QUANTITY_MESSAGE = 'Ações e renda fixa só podem ser compradas em quantidade inteira';

export function requiresWholeQuantity(assetType: string): boolean {
  return (WHOLE_QUANTITY_ASSET_TYPES as readonly string[]).includes(assetType);
}

export const createOrderInputSchema = z
  .object({
    assetId: z.string().min(1).optional(),
    ticker: z.string().min(1).optional(),
    side: z.enum(ORDER_SIDES),
    quantity: orderQuantityInputSchema,
    price: moneyAmountSchema.optional(),
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
  // Fee da InvestPro (1% do valor executado). null enquanto a ordem não
  // executa (LIMIT/STOP em OPEN) — só existe fee sobre o que de fato preenche.
  fee: z.number().nonnegative().nullable().optional(),
});

export const orderListSchema = z.object({
  items: z.array(orderSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

// Ativos que o usuário pode vender agora: só tickers com Position ativa
// (quantity > 0), não o catálogo completo de mercado.
export const sellableAssetSchema = z.object({
  ticker: z.string(),
  quantity: z.number().positive(),
});

export const sellableAssetListSchema = z.object({
  items: z.array(sellableAssetSchema),
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderList = z.infer<typeof orderListSchema>;
export type SellableAsset = z.infer<typeof sellableAssetSchema>;
export type SellableAssetList = z.infer<typeof sellableAssetListSchema>;