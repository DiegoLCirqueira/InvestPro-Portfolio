// Senhas do seed e guarda de produção. O repositório é público: nenhuma senha
// pode existir aqui nem em seed.ts. A senha vem de uma variável de ambiente ou
// é gerada aleatoriamente na hora e mostrada uma única vez.

import { randomBytes } from 'node:crypto'

export const MIN_SEED_PASSWORD_LENGTH = 12

// 24 bytes em base64url = 32 caracteres (~192 bits de entropia).
const GENERATED_PASSWORD_BYTES = 24

export interface SeedPassword {
  password: string
  generated: boolean
}

export function generateSeedPassword(): string {
  return randomBytes(GENERATED_PASSWORD_BYTES).toString('base64url')
}

// Env definida: precisa ter tamanho mínimo (o erro cita só o nome da variável,
// nunca o valor). Ausente ou vazia: gera uma senha aleatória.
export function resolveSeedPassword(envName: string, env: NodeJS.ProcessEnv = process.env): SeedPassword {
  const provided = env[envName]
  if (provided === undefined || provided === '') {
    return { password: generateSeedPassword(), generated: true }
  }
  if (provided.length < MIN_SEED_PASSWORD_LENGTH) {
    throw new Error(`${envName} deve ter pelo menos ${MIN_SEED_PASSWORD_LENGTH} caracteres.`)
  }
  return { password: provided, generated: false }
}

// O seed cria contas com saldo/posições de demonstração e um ADMIN: em produção
// só roda com autorização explícita.
export function assertSeedAllowed(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV === 'production' && env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error(
      'Seed recusado: NODE_ENV=production. O seed cria contas de demonstração e um ADMIN; ' +
        'só rode em produção com SEED_ALLOW_PRODUCTION=true, de propósito.'
    )
  }
}

// Mensagem do que aconteceu com a senha da conta. A senha só aparece quando foi
// gerada agora e a conta foi criada por esta execução; conta existente nunca tem
// a senha alterada (nem mostrada), e senha vinda de env nunca é ecoada.
export function describeAccountPassword(
  email: string,
  accountExisted: boolean,
  seedPassword: SeedPassword,
  envName: string
): string {
  if (accountExisted) return `${email}: conta já existe; senha NÃO alterada`
  if (seedPassword.generated) {
    return `${email}: conta criada com senha GERADA (mostrada só desta vez, guarde agora): ${seedPassword.password}`
  }
  return `${email}: conta criada com a senha definida em ${envName}`
}
