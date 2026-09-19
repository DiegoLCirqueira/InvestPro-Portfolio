// @investpro/shared
// Valor monetário de entrada. As colunas de saldo são Decimal(15,2): a borda só
// aceita centavos inteiros (ver decimal.ts) e nada acima do que a coluna comporta.

import { z } from 'zod';
import { hasAtMostDecimalPlaces } from './decimal.js';

export const MONEY_DECIMAL_PLACES = 2;
export const MAX_MONEY_AMOUNT = 9_999_999_999_999.99;

/** Valor monetário positivo, com no máximo 2 casas decimais e dentro do teto do Decimal(15,2). */
export const moneyAmountSchema = z
  .number()
  .positive()
  .max(MAX_MONEY_AMOUNT, { message: 'Valor acima do máximo permitido' })
  .refine((value) => hasAtMostDecimalPlaces(value, MONEY_DECIMAL_PLACES), {
    message: `Valor deve ter no máximo ${MONEY_DECIMAL_PLACES} casas decimais`,
  });
