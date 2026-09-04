import { z } from 'zod'

// CPF é definido no cadastro (auth.schema.ts) e não pode ser alterado pelo
// usuário via perfil — .strict() garante 400 explícito se o campo for enviado,
// em vez de descartá-lo silenciosamente.
export const updateUserBodySchema = z
  .object({
    fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
    phone: z.string().regex(/^\+?\d{10,15}$/, 'Telefone inválido').optional(),
  })
  .strict()

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
