// @investpro/server
// O scheduler de cotações precisa rodar o 1º ciclo na subida do servidor: sem
// isso, o cache fica vazio no primeiro minuto após cada deploy e todos os
// preços aparecem como "estimados".

import { afterEach, describe, expect, it, vi } from 'vitest'

const refreshQuotesMock = vi.hoisted(() => vi.fn(async () => undefined))
vi.mock('../market.service.js', () => ({ refreshQuotes: refreshQuotesMock }))

import { startMarketScheduler } from '../scheduler.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('startMarketScheduler', () => {
  it('atualiza as cotações imediatamente e depois a cada intervalo; só inicia uma vez', () => {
    vi.useFakeTimers()
    const log = { error: vi.fn() }

    const timer = startMarketScheduler(log, 60_000)
    expect(refreshQuotesMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(60_000)
    expect(refreshQuotesMock).toHaveBeenCalledTimes(2)

    expect(startMarketScheduler(log, 60_000)).toBeNull()
    expect(refreshQuotesMock).toHaveBeenCalledTimes(2)

    clearInterval(timer!)
  })
})
