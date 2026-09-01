import type { FastifyInstance } from 'fastify'
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from '@fastify/type-provider-zod'
import { authenticate } from '../../shared/middleware/authenticate.js'
import { readRateLimit, writeRateLimit } from '../../shared/middleware/rateLimit.js'
import {
  updateUserBodySchema,
  userMeResponseSchema,
  updateUserResponseSchema,
  errorResponseSchema,
} from './user.schema.js'
import * as userService from './user.service.js'

export async function userRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>()

  r.setValidatorCompiler(validatorCompiler)
  r.setSerializerCompiler(serializerCompiler)

  r.get(
    '/api/v1/users/me',
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ['User'],
        summary: 'Obter perfil do usuário',
        description: 'Retorna os dados do perfil do usuário autenticado.',
        security: [{ BearerAuth: [] }],
        response: {
          200: userMeResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string }
      const profile = await userService.getMe(user.id)
      return profile
    },
  )

  r.patch(
    '/api/v1/users/me',
    {
      ...writeRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ['User'],
        summary: 'Atualizar perfil do usuário',
        description: 'Atualiza os dados do perfil do usuário autenticado.',
        security: [{ BearerAuth: [] }],
        body: updateUserBodySchema,
        response: {
          200: updateUserResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string }
      const updated = await userService.updateMe(user.id, request.body)
      return updated
    },
  )
}
