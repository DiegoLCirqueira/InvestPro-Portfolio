// @investpro/server
// Violação de unique do Prisma (P2002): detecta o erro e diz QUAL campo colidiu,
// pra quem decide a resposta (ex.: e-mail duplicado x CPF duplicado).

import { Prisma } from '@prisma/client'

export function isUniqueViolation(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
}

// meta.target vem como lista de colunas (['cpf']) ou, em alguns casos, um texto.
export function uniqueViolationFields(err: Prisma.PrismaClientKnownRequestError): string[] {
  const target = err.meta?.target
  if (Array.isArray(target)) return target.map(String)
  return target ? [String(target)] : []
}
