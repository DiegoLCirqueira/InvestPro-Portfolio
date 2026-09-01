// @investpro/shared
// Contratos de câmbio de moedas. Base para WI-210.

import { z } from 'zod';
import { CURRENCIES } from '../types/enums.js';

export type Currency = (typeof CURRENCIES)[number];

export const currencySchema = z.enum(CURRENCIES);

export const exchangeRateSchema = z.object({
  from: currencySchema,
  to: currencySchema,
  rate: z.number().positive(),
  timestamp: z.string(),
});

export const convertRequestSchema = z.object({
  from: currencySchema,
  to: currencySchema,
  amount: z.number().positive(),
});

export const convertResponseSchema = z.object({
  from: currencySchema,
  to: currencySchema,
  amount: z.number().positive(),
  convertedAmount: z.number().nonnegative(),
  rate: z.number().positive(),
  fee: z.number().nonnegative(),
  timestamp: z.string(),
});

export const currencyListResponseSchema = z.object({
  base: currencySchema.default('BRL'),
  items: z.array(currencySchema),
});

export type ExchangeRate = z.infer<typeof exchangeRateSchema>;
export type ConvertRequest = z.infer<typeof convertRequestSchema>;
export type ConvertResponse = z.infer<typeof convertResponseSchema>;
export type CurrencyListResponse = z.infer<typeof currencyListResponseSchema>;