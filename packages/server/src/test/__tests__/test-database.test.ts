import { describe, expect, it } from 'vitest'
import { assertTestDatabase, LOCAL_TEST_DATABASE_URL, resolveTestDatabaseUrl } from '../test-database.js'

const SUPABASE = 'postgresql://postgres.abc:segredo@aws-0-ca-central-1.pooler.supabase.com:5432/postgres'

describe('trava do banco de testes', () => {
  it.each([
    LOCAL_TEST_DATABASE_URL,
    'postgresql://postgres:postgres@127.0.0.1:5432/investpro',
    'postgresql://postgres:postgres@localhost:5432/investpro?schema=public',
  ])('aceita banco local: %s', (url) => {
    expect(() => assertTestDatabase(url, {})).not.toThrow()
  })

  it('recusa banco remoto (ex.: Supabase de produção) sem expor a senha na mensagem', () => {
    expect(() => assertTestDatabase(SUPABASE, {})).toThrow(/não é local/)
    expect(() => assertTestDatabase(SUPABASE, {})).not.toThrow(/segredo/)
  })

  it('remoto só com ALLOW_REMOTE_TEST_DB=true explícito', () => {
    expect(() => assertTestDatabase(SUPABASE, { ALLOW_REMOTE_TEST_DB: 'true' })).not.toThrow()
  })

  it('prioridade: TEST_DATABASE_URL, depois DATABASE_URL, depois o banco local', () => {
    expect(resolveTestDatabaseUrl({ TEST_DATABASE_URL: 'a', DATABASE_URL: 'b' })).toBe('a')
    expect(resolveTestDatabaseUrl({ DATABASE_URL: 'b' })).toBe('b')
    expect(resolveTestDatabaseUrl({})).toBe(LOCAL_TEST_DATABASE_URL)
  })
})
