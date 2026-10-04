// @investpro/shared
// Contratos de câmbio de moedas. Base para WI-210.

import { z } from 'zod';
import { CURRENCIES } from '../types/enums.js';
import { moneyAmountSchema } from '../types/money.js';

export type Currency = (typeof CURRENCIES)[number];

export const currencySchema = z.enum(CURRENCIES);

// approximate: true quando a taxa é a estática de referência (fonte indisponível):
// serve pra simulação, não pra executar câmbio.
export const exchangeRateSchema = z.object({
  from: currencySchema,
  to: currencySchema,
  rate: z.number().positive(),
  approximate: z.boolean().optional(),
  timestamp: z.string(),
});

export const convertRequestSchema = z.object({
  from: currencySchema,
  to: currencySchema,
  amount: moneyAmountSchema,
});

export const convertResponseSchema = z.object({
  from: currencySchema,
  to: currencySchema,
  amount: z.number().positive(),
  convertedAmount: z.number().nonnegative(),
  rate: z.number().positive(),
  fee: z.number().nonnegative(),
  approximate: z.boolean().optional(),
  timestamp: z.string(),
});

export const currencyListResponseSchema = z.object({
  base: currencySchema.default('BRL'),
  items: z.array(currencySchema),
});

// Moedas com CurrencyHolding real no banco. Historicamente um subconjunto de
// CURRENCIES (só 5 quando o enum Currency do Prisma tinha menos moedas que a
// calculadora) — agora que o enum foi ampliado pras 9, as duas listas
// coincidem. Alias em vez de literal duplicado: se um dia o banco ficar pra
// trás da calculadora de novo, só um lugar pra ajustar.
export const EXECUTABLE_CURRENCIES = CURRENCIES;
export const executableCurrencySchema = currencySchema;

// Valor mínimo por conversão, em BRL (origem convertida pela cotação usada).
// Abaixo disso a taxa de 1% arredonda pra zero e fatiar a troca fugiria dela.
export const MIN_EXCHANGE_BRL = 1;
export const MIN_EXCHANGE_MESSAGE = 'O valor mínimo por conversão é R$ 1,00';

export const executeExchangeInputSchema = z.object({
  from: executableCurrencySchema,
  to: executableCurrencySchema,
  amount: moneyAmountSchema,
});

export const executeExchangeResponseSchema = z.object({
  id: z.string(),
  fromCurrency: executableCurrencySchema,
  toCurrency: executableCurrencySchema,
  amount: z.number().positive(),
  convertedAmount: z.number().nonnegative(),
  rate: z.number().positive(),
  fee: z.number().nonnegative(),
  createdAt: z.string(),
});

export const currencyHoldingSchema = z.object({
  currency: currencySchema,
  balance: z.number().positive(),
});

export const currencyHoldingListSchema = z.object({
  items: z.array(currencyHoldingSchema),
});

export type ExchangeRate = z.infer<typeof exchangeRateSchema>;
export type ConvertRequest = z.infer<typeof convertRequestSchema>;
export type ConvertResponse = z.infer<typeof convertResponseSchema>;
export type CurrencyListResponse = z.infer<typeof currencyListResponseSchema>;
export type ExecutableCurrency = (typeof EXECUTABLE_CURRENCIES)[number];
export type ExecuteExchangeInput = z.infer<typeof executeExchangeInputSchema>;
export type ExecuteExchangeResponse = z.infer<typeof executeExchangeResponseSchema>;
export type CurrencyHolding = z.infer<typeof currencyHoldingSchema>;
export type CurrencyHoldingList = z.infer<typeof currencyHoldingListSchema>;
