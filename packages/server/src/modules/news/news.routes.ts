// @investpro/server
// Rotas REST do módulo de notícias (públicas, com readRateLimit).

import type { FastifyInstance } from 'fastify'
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from '@fastify/type-provider-zod'
import {
  newsListSchema,
  newsQuerySchema,
} from '@investpro/shared'
import { z } from 'zod'
import { readRateLimit } from '../../shared/middleware/rateLimit.js'
import * as newsService from './news.service.js'
import { configureLogger } from './news.service.js'

// Querystring vem como string no GET; coerce numérico em page/limit.
const newsQueryQuerystringSchema = newsQuerySchema.extend({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export async function newsRoutes(app: FastifyInstance): Promise<void> {
  configureLogger(app.log)

  const r = app.withTypeProvider<ZodTypeProvider>()

  r.setValidatorCompiler(validatorCompiler)
  r.setSerializerCompiler(serializerCompiler)

  r.get(
    '/api/v1/news',
    {
      ...readRateLimit,
      schema: {
        tags: ['News'],
        summary: 'Listar notícias',
        description: 'Retorna notícias consolidadas dos feeds RSS configurados, com paginação.',
        querystring: newsQueryQuerystringSchema,
        response: {
          200: newsListSchema,
        },
      },
    },
    async (request) => {
      return newsService.getNews(request.query)
    }
  )
}