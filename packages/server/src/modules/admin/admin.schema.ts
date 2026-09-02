import { z } from 'zod'
import { USER_ROLES } from '@investpro/shared'

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: z.enum(USER_ROLES),
  createdAt: z.string(),
})

export const adminUserListResponseSchema = z.array(adminUserSchema)

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

export type AdminUser = z.infer<typeof adminUserSchema>
