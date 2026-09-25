import { z } from 'zod'
import { moneyAmountSchema } from '@investpro/shared'

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
  // Saldo em caixa (disponível pra ordens/transferências).
  balance: z.number(),
  // Patrimônio total: caixa + posições + caixinha + moedas em BRL.
  totalEquity: z.number(),
  positions: z.array(positionSchema),
})

// balance = patrimônio total do dia (nome mantido por compatibilidade);
// netFlow = aportes (+) e retiradas (-) do dia, que não contam como rendimento.
export const historyPointSchema = z.object({
  date: z.string(),
  balance: z.number(),
  netFlow: z.number(),
})

export const historyResponseSchema = z.object({
  history: z.array(historyPointSchema),
  // Só no 1º dia da conta (history com 1 ponto): evolução dentro do dia, para
  // o gráfico ter linha desde o início. Vazio a partir do 2º dia.
  intraday: z.array(z.object({ at: z.string(), balance: z.number() })),
  // Rentabilidade do período (time-weighted, %), sem contar aportes; null sem base.
  returnPct: z.number().nullable(),
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

// Top-up simulado (demo): incrementa o balance diretamente, sem representar
// um pagamento real. Existe pra permitir testar ordens/transferências sem
// depender de saldo real.
export const topUpBodySchema = z.object({
  amount: moneyAmountSchema,
})

export const topUpResponseSchema = z.object({
  balance: z.number(),
})

export type HistoryQuery = z.infer<typeof historyQuerySchema>
