// @investpro/server
// Testa a limpeza de refresh tokens expirados (WI-17) com prisma mockado.

import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  return {
    deleteMany: vi.fn(),
  }
})

vi.mock('../../../config/database.js', () => ({
  prisma: {
    refreshToken: {
      deleteMany: mocks.deleteMany,
    },
  },
}))

import { cleanupExpiredRefreshTokens, cleanupRefreshTokensIfDue } from '../scheduler.js'

describe('cleanupExpiredRefreshTokens', () => {
  it('remove apenas tokens com expiresAt no passado e devolve a contagem', async () => {
    mocks.deleteMany.mockResolvedValue({ count: 3 })

    const count = await cleanupExpiredRefreshTokens()

    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } },
    })
    expect(count).toBe(3)
  })

  it('não afeta tokens válidos (filtro deixa a cargo do banco, só passa o corte de tempo atual)', async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 })

    await cleanupExpiredRefreshTokens()

    const where = mocks.deleteMany.mock.calls[0][0].where
    const cutoff = where.expiresAt.lt as Date
    expect(cutoff.getTime()).toBeLessThanOrEqual(Date.now())
    expect(cutoff.getTime()).toBeGreaterThan(Date.now() - 5000)
  })
})

describe('cleanupRefreshTokensIfDue (serverless)', () => {
  it('roda na primeira chamada e no máximo uma vez por intervalo', async () => {
    vi.useFakeTimers()
    try {
      mocks.deleteMany.mockReset().mockResolvedValue({ count: 1 })
      const log = { error: vi.fn() }

      await cleanupRefreshTokensIfDue(log, 60_000)
      expect(cleanupRefreshTokensIfDue(log, 60_000)).toBeNull()
      expect(mocks.deleteMany).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(60_000)
      await cleanupRefreshTokensIfDue(log, 60_000)
      expect(mocks.deleteMany).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('falha no banco vai pro log e não derruba a requisição', async () => {
    vi.useFakeTimers()
    try {
      vi.advanceTimersByTime(10 * 60 * 60 * 1000) // garante que já passou o intervalo
      mocks.deleteMany.mockReset().mockRejectedValue(new Error('db fora'))
      const log = { error: vi.fn() }

      await expect(cleanupRefreshTokensIfDue(log, 60_000)).resolves.toBeUndefined()
      expect(log.error).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
