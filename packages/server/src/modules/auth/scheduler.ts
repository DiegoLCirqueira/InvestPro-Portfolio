// @investpro/server
// Limpeza periódica de refresh tokens expirados que nunca foram usados
// (WI-17: hoje só saem da tabela via logout ou reuso pós-expiração).

import type { FastifyBaseLogger } from 'fastify'
import { prisma } from '../../config/database.js'

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

let started = false
let lastCleanupAt = 0

export async function cleanupExpiredRefreshTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}

function runCleanup(log: Pick<FastifyBaseLogger, 'error'>): Promise<void> {
  return cleanupExpiredRefreshTokens().then(
    () => undefined,
    (err) => log.error({ err }, 'Erro na limpeza de refresh tokens expirados')
  )
}

export function startRefreshTokenCleanup(
  log: FastifyBaseLogger,
  intervalMs = CLEANUP_INTERVAL_MS
): NodeJS.Timeout | null {
  if (started) return null
  started = true

  const timer = setInterval(() => void runCleanup(log), intervalMs)

  timer.unref()
  return timer
}

// Serverless (sem setInterval): uma requisição de auth dispara a limpeza, no
// máximo uma vez por intervalo nesta instância. null = ainda não é a hora.
export function cleanupRefreshTokensIfDue(
  log: Pick<FastifyBaseLogger, 'error'>,
  intervalMs = CLEANUP_INTERVAL_MS
): Promise<void> | null {
  const now = Date.now()
  if (now - lastCleanupAt < intervalMs) return null
  lastCleanupAt = now
  return runCleanup(log)
}
