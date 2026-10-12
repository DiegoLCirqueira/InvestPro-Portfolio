// @investpro/server
// Teto GLOBAL de e-mails de redefinição de senha, contado no banco. O rate limit
// por IP e o cooldown por e-mail (emailRateLimit.ts) vivem em memória de cada
// instância serverless: não impedem que uma lista de e-mails válidos, disparada um
// a um de IPs diferentes, esgote a cota paga do Resend e derrube o reset de todos.

import { env } from '../../../config/env.js'
import { prisma } from '../../../config/database.js'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

// Serializa as reservas de vaga: sem isso, pedidos simultâneos leriam a mesma
// contagem e passariam juntos do teto.
const BUDGET_LOCK_KEY = 'password-reset-email-budget'

export interface ResetEmailLimits {
  perHour: number
  perDay: number
}

const defaultLimits = (): ResetEmailLimits => ({
  perHour: env.PASSWORD_RESET_EMAILS_PER_HOUR,
  perDay: env.PASSWORD_RESET_EMAILS_PER_DAY,
})

// Reserva uma vaga de envio. true = pode enviar (a vaga já fica registrada);
// false = teto da hora ou do dia atingido, não envie.
export async function claimResetEmailSlot(
  limits: ResetEmailLimits = defaultLimits(),
  now: Date = new Date()
): Promise<boolean> {
  const hourAgo = new Date(now.getTime() - HOUR_MS)
  const dayAgo = new Date(now.getTime() - DAY_MS)

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${BUDGET_LOCK_KEY}))`

    // Só o último dia importa pra contagem: o resto é lixo, apagado aqui mesmo.
    await tx.passwordResetEmailSend.deleteMany({ where: { createdAt: { lt: dayAgo } } })

    const [lastHour, lastDay] = await Promise.all([
      tx.passwordResetEmailSend.count({ where: { createdAt: { gte: hourAgo } } }),
      tx.passwordResetEmailSend.count({ where: { createdAt: { gte: dayAgo } } }),
    ])
    if (lastHour >= limits.perHour || lastDay >= limits.perDay) return false

    await tx.passwordResetEmailSend.create({ data: { createdAt: now } })
    return true
  })
}
