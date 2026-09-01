import { z } from 'zod'

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/

export const updateUserBodySchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  phone: z.string().regex(/^\+?\d{10,15}$/, 'Telefone inválido').optional(),
  cpf: z
    .string()
    .regex(cpfRegex, 'CPF inválido (use XXX.XXX.XXX-XX ou 11 dígitos)')
    .optional(),
})

export const userMeResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  phone: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  role: z.enum(['USER', 'ADMIN']),
  createdAt: z.string(),
})

export const updateUserResponseSchema = userMeResponseSchema

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>
