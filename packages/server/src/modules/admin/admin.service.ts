import { prisma } from '../../config/database.js'
import type { AdminUser } from './admin.schema.js'

const adminUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  createdAt: true,
} as const

export async function listUsers(): Promise<AdminUser[]> {
  const users = await prisma.user.findMany({
    select: adminUserSelect,
    orderBy: { createdAt: 'desc' },
  })

  return users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() }))
}
