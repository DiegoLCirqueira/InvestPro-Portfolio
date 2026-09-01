// @investpro/server
// Scheduler em background que mantém as cotações frescas no cache.

import type { FastifyBaseLogger } from 'fastify'
import { refreshQuotes } from './market.service.js'

let started = false

export function startMarketScheduler(
  log: FastifyBaseLogger,
  intervalMs = 60_000
): NodeJS.Timeout | null {
  if (started) return null
  started = true

  const timer = setInterval(() => {
    refreshQuotes().catch((err) => {
      log.error({ err }, 'Erro no scheduler de mercado')
    })
  }, intervalMs)

  timer.unref()
  return timer
}