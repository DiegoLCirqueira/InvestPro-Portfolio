import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword, BCRYPT_COST } from '../lib/password.js'

const PASSWORD = 'InvestPro@123'

describe('hashPassword / verifyPassword', () => {
  it('gera um hash bcrypt diferente da senha original', async () => {
    const hash = await hashPassword(PASSWORD)
    expect(hash).not.toBe(PASSWORD)
    expect(hash).toMatch(/^\$2[aby]\$/)
  })

  it('verifica a senha correta', async () => {
    const hash = await hashPassword(PASSWORD)
    await expect(verifyPassword(PASSWORD, hash)).resolves.toBe(true)
  })

  it('rejeita senha incorreta', async () => {
    const hash = await hashPassword(PASSWORD)
    await expect(verifyPassword('senha-incorreta', hash)).resolves.toBe(false)
  })

  it('usa salt aleatório (hashes diferentes para a mesma senha)', async () => {
    const [first, second] = await Promise.all([
      hashPassword(PASSWORD),
      hashPassword(PASSWORD),
    ])
    expect(first).not.toBe(second)
    await expect(verifyPassword(PASSWORD, first)).resolves.toBe(true)
    await expect(verifyPassword(PASSWORD, second)).resolves.toBe(true)
  })

  it('usa custo bcrypt adequado para produção', () => {
    expect(BCRYPT_COST).toBeGreaterThanOrEqual(10)
  })
})