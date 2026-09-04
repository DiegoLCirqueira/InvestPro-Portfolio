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

import { cleanupExpiredRefreshTokens } from '../scheduler.js'

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
