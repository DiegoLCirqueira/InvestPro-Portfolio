import { z } from 'zod'

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/

// Normaliza (trim + lowercase) ANTES de validar o formato — assim " Foo@Bar.com "
// passa a bater com "foo@bar.com" já salvo, e cobre automaticamente todo
// endpoint que reusar este schema (register/login/forgotPassword e qualquer
// futuro ponto de entrada), sem precisar normalizar manualmente em cada
// handler/service (WI-20, parecer do AppSec). toLowerCase() não é
// case-folding RFC-perfeito pro local-part (RFC 5321 permite, em tese,
// local-part case-sensitive), mas é o padrão de mercado aceito — Gmail e
// Outlook fazem a mesma normalização. Não faz normalização estilo Gmail
// (ignorar pontos/+tag) — só trim + lowercase, por decisão explícita.
const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Email inválido'))

export const registerBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  cpf: z.string().regex(cpfRegex, 'CPF inválido (use XXX.XXX.XXX-XX ou 11 dígitos)').optional(),
})

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
  // WI-27: controla SÓ a duração do refresh token (30 dias vs. 7 dias
  // padrão). O access token nunca muda — sempre 15min.
  rememberMe: z.boolean().optional().default(false),
})

// O handler não lê nada do body (usa apenas o cookie httpOnly do refresh
// token), e o frontend chama /auth/refresh sem enviar body nenhum — nesse
// caso o Fastify entrega request.body como null (sem Content-Type, não
// undefined), então o schema precisa aceitar {}, null e undefined.
export const refreshBodySchema = z.object({}).nullish()

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

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
})

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  newPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export type RegisterBody = z.infer<typeof registerBodySchema>
export type LoginBody = z.infer<typeof loginBodySchema>
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>
