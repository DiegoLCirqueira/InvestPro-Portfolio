import { z } from 'zod'
import {
  CPF_REQUIRES_PASSWORD_MESSAGE,
  cpfInputSchema,
  hasPasswordWhenSettingCpf,
} from '@investpro/shared'

// CPF pode ser definido pelo perfil UMA vez: transferir exige CPF (BACEN) e o
// cadastro não o pede, então sem isso uma conta nova nunca transferiria. Depois
// de salvo fica travado (identidade financeira): o service responde 409
// CPF_ALREADY_SET. Definir o CPF exige currentPassword no mesmo body (400 se
// faltar; a senha em si é conferida no service). O schema já entrega o CPF
// normalizado (11 dígitos) e com dígitos verificadores válidos. .strict() dá 400
// explícito a campos desconhecidos em vez de descartá-los silenciosamente.
export const updateUserBodySchema = z
  .object({
    fullName: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
    phone: z.string().regex(/^\+?\d{10,15}$/, 'Telefone inválido').optional(),
    cpf: cpfInputSchema.optional(),
    currentPassword: z.string().min(1).optional(),
  })
  .strict()
  .refine(hasPasswordWhenSettingCpf, {
    message: CPF_REQUIRES_PASSWORD_MESSAGE,
    path: ['currentPassword'],
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
