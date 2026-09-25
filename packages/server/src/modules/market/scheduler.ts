// @investpro/server
// Scheduler em background que mantém as cotações frescas no cache.

import type { FastifyBaseLogger } from 'fastify'
import { refreshQuotes } from './market.service.js'

let started = false

export function startMarketScheduler(
  log: Pick<FastifyBaseLogger, 'error'>,
  intervalMs = 60_000
): NodeJS.Timeout | null {
  if (started) return null
  started = true

  const tick = () => {
    refreshQuotes().catch((err) => {
      log.error({ err }, 'Erro no scheduler de mercado')
    })
  }

  // Primeiro ciclo já na subida: sem ele, o cache fica vazio no 1º minuto
  // após cada deploy e todos os preços aparecem como "estimados".
  tick()
  const timer = setInterval(tick, intervalMs)

  timer.unref()
  return timer
}
