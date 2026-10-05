// @investpro/server
// Em função serverless não há processo contínuo: os setInterval (cotações e
// limpeza de refresh tokens) não podem subir com SERVERLESS=1 nem VERCEL=1.
// O env é lido no import, então cada cenário recarrega os módulos.

import { afterEach, describe, expect, it, vi } from 'vitest'

const { startMarketScheduler, startRefreshTokenCleanup } = vi.hoisted(() => ({
  startMarketScheduler: vi.fn(),
  startRefreshTokenCleanup: vi.fn(),
}))

vi.mock('../modules/market/scheduler.js', () => ({ startMarketScheduler }))
vi.mock('../modules/auth/scheduler.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../modules/auth/scheduler.js')>()),
  startRefreshTokenCleanup,
}))

async function buildFresh() {
  vi.resetModules()
  const { buildServer } = await import('../server.js')
  const app = await buildServer()
  await app.close()
}

afterEach(() => {
  vi.unstubAllEnvs()
  startMarketScheduler.mockClear()
  startRefreshTokenCleanup.mockClear()
})

describe('schedulers', () => {
  it.each([
    ['SERVERLESS', '1'],
    ['VERCEL', '1'],
  ])('não sobem com %s=%s', async (name, value) => {
    vi.stubEnv('SERVERLESS', '')
    vi.stubEnv('VERCEL', '')
    vi.stubEnv(name, value)

    await buildFresh()

    expect(startMarketScheduler).not.toHaveBeenCalled()
    expect(startRefreshTokenCleanup).not.toHaveBeenCalled()
  })

  it('sobem fora do serverless (local e contêiner)', async () => {
    vi.stubEnv('SERVERLESS', '')
    vi.stubEnv('VERCEL', '')

    await buildFresh()

    expect(startMarketScheduler).toHaveBeenCalledTimes(1)
    expect(startRefreshTokenCleanup).toHaveBeenCalledTimes(1)
  })
})
