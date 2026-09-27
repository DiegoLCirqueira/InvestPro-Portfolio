import type { FastifyInstance } from 'fastify'
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from '@fastify/type-provider-zod'
import {
  investorProfileResponseSchema,
  investorQuestionnaire,
  investorQuestionnaireResponseSchema,
  saveInvestorProfileBodySchema,
} from '@investpro/shared'
import { authenticate } from '../../shared/middleware/authenticate.js'
import { readRateLimit, writeRateLimit } from '../../shared/middleware/rateLimit.js'
import {
  updateUserBodySchema,
  userMeResponseSchema,
  updateUserResponseSchema,
  errorResponseSchema,
} from './user.schema.js'
import * as userService from './user.service.js'
import * as investorProfileService from './investor-profile.service.js'

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
        description:
          'Atualiza os dados do perfil do usuário autenticado. Definir o CPF (uma única vez) exige currentPassword: senha errada = 403 INVALID_CURRENT_PASSWORD.',
        security: [{ BearerAuth: [] }],
        body: updateUserBodySchema,
        response: {
          200: updateUserResponseSchema,
          400: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string }
      const updated = await userService.updateMe(user.id, request.body)
      return updated
    },
  )

  r.get(
    '/api/v1/users/me/investor-profile',
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ['User'],
        summary: 'Obter perfil de investidor',
        description: 'Retorna o perfil de investidor do usuário autenticado, ou null se o questionário ainda não foi respondido.',
        security: [{ BearerAuth: [] }],
        response: {
          200: investorProfileResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string }
      return { profile: await investorProfileService.getInvestorProfile(user.id) }
    },
  )

  r.put(
    '/api/v1/users/me/investor-profile',
    {
      ...writeRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ['User'],
        summary: 'Responder o questionário de perfil de investidor',
        description:
          'Recebe as respostas (id da pergunta → id da opção), calcula a pontuação no servidor e grava o perfil. Refazer sobrescreve o anterior.',
        security: [{ BearerAuth: [] }],
        body: saveInvestorProfileBodySchema,
        response: {
          200: investorProfileResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string }
      return { profile: await investorProfileService.saveInvestorProfile(user.id, request.body.answers) }
    },
  )

  r.get(
    '/api/v1/users/me/investor-profile/questionnaire',
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ['User'],
        summary: 'Questionário de perfil de investidor',
        description:
          'Perguntas e opções (sem a pontuação, calculada só no servidor) e os perfis possíveis com a carteira de referência de cada um.',
        security: [{ BearerAuth: [] }],
        response: {
          200: investorQuestionnaireResponseSchema,
        },
      },
    },
    async () => investorQuestionnaire(),
  )
}
