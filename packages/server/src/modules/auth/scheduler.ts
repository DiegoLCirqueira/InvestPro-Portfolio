// @investpro/server
// Limpeza periódica de refresh tokens expirados que nunca foram usados
// (WI-17: hoje só saem da tabela via logout ou reuso pós-expiração).

import type { FastifyBaseLogger } from 'fastify'
import { prisma } from '../../config/database.js'

let started = false

export async function cleanupExpiredRefreshTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}

export function startRefreshTokenCleanup(
  log: FastifyBaseLogger,
  intervalMs = 60 * 60 * 1000
): NodeJS.Timeout | null {
  if (started) return null
  started = true

  const timer = setInterval(() => {
    cleanupExpiredRefreshTokens().catch((err) => {
      log.error({ err }, 'Erro na limpeza de refresh tokens expirados')
    })
  }, intervalMs)

  timer.unref()
  return timer
}
