// @investpro/server
// Rotas REST do módulo de mercado (públicas, com readRateLimit).

import type { FastifyInstance } from 'fastify'
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from '@fastify/type-provider-zod'
import {
  assetListSchema,
  assetQuerySchema,
  errorResponseSchema,
  priceHistoryQuerySchema,
  priceHistorySchema,
  quoteSchema,
} from '@investpro/shared'
import { z } from 'zod'
import { readRateLimit } from '../../shared/middleware/rateLimit.js'
import * as marketService from './market.service.js'
import { configureLogger } from './market.service.js'
import { startMarketScheduler } from './scheduler.js'

const tickerParamsSchema = z.object({
  ticker: z.string().min(1),
})

// Querystring do GET via URL vem como string; coerce numérico no page/limit.
const assetQueryQuerystringSchema = assetQuerySchema.extend({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const historyQuerySchema = priceHistoryQuerySchema
  .omit({ ticker: true })
  .extend({
    limit: z.coerce.number().int().positive().max(500).default(30),
  })

export async function marketRoutes(app: FastifyInstance): Promise<void> {
  configureLogger(app.log)

  const r = app.withTypeProvider<ZodTypeProvider>()

  r.setValidatorCompiler(validatorCompiler)
  r.setSerializerCompiler(serializerCompiler)

  r.get(
    '/api/v1/market/assets',
    {
      ...readRateLimit,
      schema: {
        tags: ['Market'],
        summary: 'Listar ativos de mercado',
        description: 'Lista os ativos suportados, com filtros por tipo e busca.',
        querystring: assetQueryQuerystringSchema,
        response: {
          200: assetListSchema,
        },
      },
    },
    async (request) => {
      return marketService.getAssets(request.query)
    }
  )

  r.get(
    '/api/v1/market/quotes/:ticker',
    {
      ...readRateLimit,
      schema: {
        tags: ['Market'],
        summary: 'Cotação de um ativo',
        description: 'Retorna a cotação atual (cache TTL 60s; fallback controlado).',
        params: tickerParamsSchema,
        response: {
          200: quoteSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return marketService.getQuote(request.params.ticker)
    }
  )

  r.get(
    '/api/v1/market/assets/:ticker/history',
    {
      ...readRateLimit,
      schema: {
        tags: ['Market'],
        summary: 'Histórico de preço de um ativo',
        description: 'Série temporal determinística gerada a partir da cotação atual.',
        params: tickerParamsSchema,
        querystring: historyQuerySchema,
        response: {
          200: priceHistorySchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return marketService.getHistory(request.params.ticker, request.query)
    }
  )

  startMarketScheduler(app.log)
}