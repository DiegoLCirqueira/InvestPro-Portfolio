import { z } from 'zod'

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/

export const registerBodySchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  cpf: z.string().regex(cpfRegex, 'CPF inválido (use XXX.XXX.XXX-XX ou 11 dígitos)').optional(),
})

export const loginBodySchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export const refreshBodySchema = z.object({})

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
})

export const authResponseSchema = z.object({
  user: userResponseSchema,
  accessToken: z.string(),
})

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
})

export const logoutResponseSchema = z.object({
  message: z.string(),
})

export type RegisterBody = z.infer<typeof registerBodySchema>
export type LoginBody = z.infer<typeof loginBodySchema>
