import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    zodParsedBody?: unknown
    user?: {
      id: string
      email: string
      fullName: string
      role: string
    }
  }
}

export type ZodFastifyInstance = FastifyInstance & {
  withTypeProvider(): FastifyInstance<any, any, any, any, ZodTypeProvider>
}
