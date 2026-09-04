import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import { AppError } from '../auth/auth.service.js'
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

export async function updateMe(userId: string, data: UpdateUserBody) {
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!existing) {
    throw new AppError('USER_NOT_FOUND', 'Usuário não encontrado', 404)
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.phone !== undefined && { phone: data.phone }),
      },
      select: userSelect,
    })

    return { ...user, createdAt: user.createdAt.toISOString() }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError('DUPLICATE_VALUE', 'Valor duplicado', 409)
    }
    throw err
  }
}
