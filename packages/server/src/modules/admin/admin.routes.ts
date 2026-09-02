import type { FastifyInstance } from 'fastify'
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from '@fastify/type-provider-zod'
import { authenticate } from '../../shared/middleware/authenticate.js'
import { requireRole } from '../../shared/middleware/authorize.js'
import { readRateLimit } from '../../shared/middleware/rateLimit.js'
import { adminUserListResponseSchema, errorResponseSchema } from './admin.schema.js'
import * as adminService from './admin.service.js'

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>()

  r.setValidatorCompiler(validatorCompiler)
  r.setSerializerCompiler(serializerCompiler)

  r.get(
    '/api/v1/admin/users',
    {
      ...readRateLimit,
      preHandler: [authenticate, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'],
        summary: 'Listar usuários',
        description: 'Lista todos os usuários do sistema. Requer role ADMIN.',
        security: [{ BearerAuth: [] }],
        response: {
          200: adminUserListResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async () => {
      return adminService.listUsers()
    },
  )
}
