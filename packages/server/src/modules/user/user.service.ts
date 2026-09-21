import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { AppError } from '../auth/auth.service.js'
import { verifyPassword } from '../auth/lib/password.js'
import {
  clearLoginAttempts,
  isAccountRateLimited,
  registerLoginFailure,
} from '../auth/lib/loginRateLimit.js'
import type { UpdateUserBody } from './user.schema.js'

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  cpf: true,
  role: true,
  createdAt: true,
} as const

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  })

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'Usuário não encontrado', 404)
  }

  return { ...user, createdAt: user.createdAt.toISOString() }
}

// Reconfirma a senha antes de fixar o CPF. Senha errada é 403 (não 401: o
// frontend trata 401 como sessão expirada). O contador por conta reaproveita o do
// login pra o endpoint não virar oráculo de senha para quem tem só um access token.
async function assertCurrentPassword(userId: string, currentPassword: string): Promise<void> {
  const attemptKey = `profile-password:${userId}`
  if (isAccountRateLimited(attemptKey)) {
    throw new AppError(
      'ACCOUNT_RATE_LIMITED',
      'Muitas tentativas de senha para esta conta. Tente novamente em alguns minutos.',
      429
    )
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } })
  if (!user) throw new AppError('USER_NOT_FOUND', 'Usuário não encontrado', 404)

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    registerLoginFailure(attemptKey)
    throw new AppError('INVALID_CURRENT_PASSWORD', 'Senha atual incorreta', 403)
  }
  clearLoginAttempts(attemptKey)
}

// Grava o CPF só se a conta ainda não tem um: o `cpf: null` no WHERE torna o
// update condicional, então dois PATCH simultâneos não se sobrescrevem (o
// segundo vê o CPF já gravado e não casa nenhuma linha).
async function setCpfOnce(tx: Prisma.TransactionClient, userId: string, cpf: string): Promise<void> {
  const { count } = await tx.user.updateMany({ where: { id: userId, cpf: null }, data: { cpf } })
  if (count === 0) {
    throw new AppError('CPF_ALREADY_SET', 'CPF já definido e não pode ser alterado', 409)
  }
}

// CPF de outra conta: a mensagem não confirma que ele existe nem de quem é.
function cpfInUseError(): AppError {
  return new AppError('CPF_IN_USE', 'Não foi possível usar este CPF', 409)
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
}

export async function updateMe(userId: string, data: UpdateUserBody) {
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!existing) {
    throw new AppError('USER_NOT_FOUND', 'Usuário não encontrado', 404)
  }

  // O schema garante currentPassword quando há cpf; '' cai em senha incorreta.
  if (data.cpf !== undefined) await assertCurrentPassword(userId, data.currentPassword ?? '')

  try {
    // Transação: um CPF recusado não pode deixar nome/telefone pela metade.
    const user = await prisma.$transaction(async (tx) => {
      if (data.cpf !== undefined) await setCpfOnce(tx, userId, data.cpf)

      return tx.user.update({
        where: { id: userId },
        data: {
          ...(data.fullName !== undefined && { fullName: data.fullName }),
          ...(data.phone !== undefined && { phone: data.phone }),
        },
        select: userSelect,
      })
    })

    return { ...user, createdAt: user.createdAt.toISOString() }
  } catch (err) {
    // O único unique atualizável aqui é o CPF.
    if (isUniqueViolation(err)) throw cpfInUseError()
    throw err
  }
}
