// @investpro/server
// Teste de INTEGRAÇÃO do teto global de e-mails de redefinição contra o Postgres
// de teste. Usa um relógio em 2100 pra que as vagas reais criadas em paralelo por
// outros testes (forgot-password) fiquem fora das janelas contadas aqui.

import { afterEach, describe, expect, it } from 'vitest'
import { prisma } from '../../../config/database.js'
import { claimResetEmailSlot } from '../lib/resetEmailBudget.js'

const FUTURE = new Date('2100-01-01T12:00:00.000Z')
const minutesAfter = (base: Date, minutes: number): Date => new Date(base.getTime() + minutes * 60_000)

afterEach(async () => {
  await prisma.passwordResetEmailSend.deleteMany({ where: { createdAt: { gte: new Date('2099-01-01') } } })
})

describe('claimResetEmailSlot', () => {
  it('libera até o teto da hora e recusa a partir daí', async () => {
    const limits = { perHour: 2, perDay: 10 }

    expect(await claimResetEmailSlot(limits, FUTURE)).toBe(true)
    expect(await claimResetEmailSlot(limits, minutesAfter(FUTURE, 1))).toBe(true)
    expect(await claimResetEmailSlot(limits, minutesAfter(FUTURE, 2))).toBe(false)
  })

  it('vaga recusada não conta: a janela da hora volta a liberar quando a anterior expira', async () => {
    const limits = { perHour: 1, perDay: 10 }

    expect(await claimResetEmailSlot(limits, FUTURE)).toBe(true)
    expect(await claimResetEmailSlot(limits, minutesAfter(FUTURE, 30))).toBe(false)
    expect(await claimResetEmailSlot(limits, minutesAfter(FUTURE, 61))).toBe(true)
  })

  it('o teto do dia vale mesmo com a hora livre', async () => {
    const limits = { perHour: 10, perDay: 2 }

    expect(await claimResetEmailSlot(limits, FUTURE)).toBe(true)
    expect(await claimResetEmailSlot(limits, minutesAfter(FUTURE, 120))).toBe(true)
    expect(await claimResetEmailSlot(limits, minutesAfter(FUTURE, 240))).toBe(false)
  })

  it('pedidos simultâneos não passam juntos do teto', async () => {
    const limits = { perHour: 3, perDay: 10 }

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => claimResetEmailSlot(limits, minutesAfter(FUTURE, i / 100)))
    )

    expect(results.filter(Boolean)).toHaveLength(3)
  })
})
