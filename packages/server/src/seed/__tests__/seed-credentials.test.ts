// @investpro/server
// Testes do helper de senhas do seed e guarda de produção (prisma/seed-credentials.ts),
// mais um teste-guarda do código-fonte do seed: o repositório é público e o seed
// não pode voltar a ter senha fixa nem logar hash. Nada aqui toca em banco.

import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  assertSeedAllowed,
  describeAccountPassword,
  generateSeedPassword,
  MIN_SEED_PASSWORD_LENGTH,
  resolveSeedPassword,
} from '../../../prisma/seed-credentials.js'

// Valores de teste gerados por execução: nenhum valor fixo de senha no repositório.
const randomText = (length: number): string => randomBytes(length).toString('base64url').slice(0, length)

describe('resolveSeedPassword', () => {
  it('env definida e válida (>= 12) é usada como está, sem marcar como gerada', () => {
    const provided = randomText(MIN_SEED_PASSWORD_LENGTH)

    expect(resolveSeedPassword('SEED_ADMIN_PASSWORD', { SEED_ADMIN_PASSWORD: provided })).toEqual({
      password: provided,
      generated: false,
    })
  })

  it('env curta (< 12) falha citando só o NOME da variável, nunca o valor', () => {
    const tooShort = randomText(MIN_SEED_PASSWORD_LENGTH - 1)
    let message = ''

    try {
      resolveSeedPassword('SEED_ADMIN_PASSWORD', { SEED_ADMIN_PASSWORD: tooShort })
    } catch (err) {
      message = (err as Error).message
    }

    expect(message).toContain('SEED_ADMIN_PASSWORD')
    expect(message).toContain(String(MIN_SEED_PASSWORD_LENGTH))
    expect(message).not.toContain(tooShort)
  })

  it.each([
    ['ausente', {}],
    ['vazia', { SEED_USER_PASSWORD: '' }],
  ])('env %s gera senha aleatória forte, diferente a cada chamada', (_case, env) => {
    const first = resolveSeedPassword('SEED_USER_PASSWORD', env)
    const second = resolveSeedPassword('SEED_USER_PASSWORD', env)

    expect(first.generated).toBe(true)
    expect(first.password.length).toBeGreaterThanOrEqual(24)
    expect(first.password).toMatch(/^[A-Za-z0-9_-]+$/) // base64url
    expect(second.password).not.toBe(first.password)
  })
})

describe('generateSeedPassword', () => {
  it('gera >= 24 caracteres e nunca repete', () => {
    const passwords = Array.from({ length: 50 }, generateSeedPassword)

    expect(passwords.every((password) => password.length >= 24)).toBe(true)
    expect(new Set(passwords).size).toBe(passwords.length)
  })
})

describe('assertSeedAllowed (guarda de produção)', () => {
  it('em produção recusa, a menos que SEED_ALLOW_PRODUCTION seja exatamente "true"', () => {
    expect(() => assertSeedAllowed({ NODE_ENV: 'production' })).toThrow('NODE_ENV=production')
    expect(() => assertSeedAllowed({ NODE_ENV: 'production', SEED_ALLOW_PRODUCTION: 'false' })).toThrow()
    expect(() => assertSeedAllowed({ NODE_ENV: 'production', SEED_ALLOW_PRODUCTION: '1' })).toThrow()
    expect(() => assertSeedAllowed({ NODE_ENV: 'production', SEED_ALLOW_PRODUCTION: 'TRUE' })).toThrow()
    expect(() => assertSeedAllowed({ NODE_ENV: 'production', SEED_ALLOW_PRODUCTION: 'true' })).not.toThrow()
  })

  it.each([['development'], ['test'], [undefined]])('fora de produção (%s) roda normalmente', (nodeEnv) => {
    expect(() => assertSeedAllowed({ NODE_ENV: nodeEnv })).not.toThrow()
  })
})

describe('describeAccountPassword', () => {
  const email = 'alguem@example.com'

  it('conta que já existe: avisa que a senha NÃO foi alterada e nunca mostra a senha', () => {
    const generated = { password: randomText(32), generated: true }

    const message = describeAccountPassword(email, true, generated, 'SEED_USER_PASSWORD')

    expect(message).toContain('conta já existe; senha NÃO alterada')
    expect(message).not.toContain(generated.password)
  })

  it('conta criada com senha gerada: mostra a senha (uma vez, aqui)', () => {
    const generated = { password: randomText(32), generated: true }

    expect(describeAccountPassword(email, false, generated, 'SEED_USER_PASSWORD')).toContain(generated.password)
  })

  it('conta criada com senha da env: cita a variável e NÃO ecoa o valor', () => {
    const fromEnv = { password: randomText(20), generated: false }

    const message = describeAccountPassword(email, false, fromEnv, 'SEED_ADMIN_PASSWORD')

    expect(message).toContain('SEED_ADMIN_PASSWORD')
    expect(message).not.toContain(fromEnv.password)
  })
})

// Guarda do código-fonte: falha se alguém recolocar senha fixa no seed (repositório público).
describe('prisma/seed.ts (guarda do código-fonte)', () => {
  const seedSource = readFileSync(new URL('../../../prisma/seed.ts', import.meta.url), 'utf8')

  it('nenhuma string literal é passada a hash/hashSync/hashPassword', () => {
    expect(seedSource).not.toMatch(/\b(?:hashSync|hash|hashPassword)\s*\(\s*['"`]/)
  })

  it('não guarda senha em constante/propriedade literal (constantes *_ENV guardam só o NOME da variável)', () => {
    expect(seedSource).not.toMatch(/\b(?!\w*_ENV\b)\w*password\w*\s*[:=]\s*['"`]/i)
  })

  it('nunca loga hash', () => {
    expect(seedSource).not.toMatch(/console\.\w+\([^)]*hash/i)
  })

  it('a guarda de produção roda antes de qualquer acesso ao banco', () => {
    const guard = seedSource.indexOf('assertSeedAllowed()')
    const firstDatabaseAccess = seedSource.indexOf('await accountExists(')

    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(firstDatabaseAccess)
  })

  it('os dois portfólios (admin e demo) seguem com update vazio: o saldo nunca é resetado pelo seed', () => {
    const upsertsWithEmptyUpdate = seedSource.match(/portfolio\.upsert\(\{[\s\S]*?update:\s*\{\}/g)

    expect(upsertsWithEmptyUpdate).toHaveLength(2)
  })

  it('o upsert do admin nunca eleva role em update: só cria com ADMIN, nunca promove conta existente', () => {
    const userUpserts = seedSource.match(/user\.upsert\(\{[\s\S]*?\n {2}\}\)/g) ?? []

    expect(userUpserts.length).toBeGreaterThan(0)
    for (const upsert of userUpserts) {
      const updateClause = upsert.match(/update:\s*\{([\s\S]*?)\}/)?.[1] ?? ''
      expect(updateClause).not.toMatch(/role/)
    }
  })

  it('conta pré-existente com o email do admin é recusada, nunca promovida', () => {
    expect(seedSource).toMatch(/if\s*\(\s*adminExisted\s*\)\s*\{[\s\S]*?throw new Error/)
  })
})
