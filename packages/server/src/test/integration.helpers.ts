// @investpro/server
// Helpers de integração para testes de rota autenticada contra o PostgreSQL real.
// Não faz parte da suíte de testes (sem sufixo .test.ts) — apenas utilitários.

import jwt from 'jsonwebtoken'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../server.js'
import { prisma } from '../config/database.js'
import { env } from '../config/env.js'

let seq = 0

/** Email único para cada usuário de teste (evita colisão de unique no DB real). */
export function uniqueEmail(prefix = 'qa'): string {
  seq += 1
  return `${prefix}-${Date.now()}-${seq}@test.com`
}

/** IP único para cada cliente de teste, isolando o rate-limit do Fastify. */
export function uniqueIp(): string {
  seq += 1
  const n = (seq % 240) + 1
  return `10.200.0.${n}`
}

export async function startApp(): Promise<FastifyInstance> {
  return buildServer()
}

export async function stopApp(app?: FastifyInstance): Promise<void> {
  await app?.close()
}

/** Retorna um access token válido (mesmo JWT_SECRET) sem passar por /auth/login. */
export function signAccessTokenFor(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET as string, { expiresIn: '15m' })
}

/** Registra um usuário de teste via rota real e devolve status + corpo. */
export async function registerTestUser(app: FastifyInstance, email = uniqueEmail()) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    remoteAddress: uniqueIp(),
    payload: { email, password: 'SenhaForte123', fullName: 'QA User' },
  })
  return { status: res.statusCode, body: res.json() }
}

/** Remove do DB real todos os dados criados para um usuário de teste. */
export async function deleteUser(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return

  const portfolio = await prisma.portfolio.findUnique({ where: { userId: user.id } })

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } })
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
  await prisma.transfer.deleteMany({ where: { userId: user.id } })
  await prisma.bankAccount.deleteMany({ where: { userId: user.id } })
  await prisma.order.deleteMany({ where: { userId: user.id } })
  if (portfolio) {
    await prisma.position.deleteMany({ where: { portfolioId: portfolio.id } })
    await prisma.portfolio.delete({ where: { id: portfolio.id } })
  }
  await prisma.user.delete({ where: { id: user.id } })
}
