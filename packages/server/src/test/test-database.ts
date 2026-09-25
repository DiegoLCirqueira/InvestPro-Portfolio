// @investpro/server
// Qual banco os testes de integração usam, e a trava que impede apontar para
// produção. Os testes criam/apagam contas e abrem muitas conexões em paralelo:
// contra o Supabase de produção, esgotavam o pool (15 conexões) e derrubavam o
// site enquanto rodavam.

/** Postgres descartável do docker-compose (serviço postgres-test, porta 5433). */
export const LOCAL_TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/investpro_test?schema=public'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/**
 * URL do banco de testes: TEST_DATABASE_URL, senão DATABASE_URL (o CI usa o
 * serviço postgres do próprio job), senão o banco local de testes.
 */
export function resolveTestDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.TEST_DATABASE_URL || env.DATABASE_URL || LOCAL_TEST_DATABASE_URL
}

/** Lança se a URL não for de um Postgres local, salvo ALLOW_REMOTE_TEST_DB=true explícito. */
export function assertTestDatabase(url: string, env: NodeJS.ProcessEnv = process.env): void {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    throw new Error('Banco de testes com URL inválida (TEST_DATABASE_URL/DATABASE_URL).')
  }

  if (LOCAL_HOSTS.has(host) || env.ALLOW_REMOTE_TEST_DB === 'true') return

  throw new Error(
    `Testes recusados: o banco "${host}" não é local. Os testes criam e apagam dados e ` +
      'esgotam conexões — nunca rode contra produção. Suba o banco de testes com ' +
      '"npm run test:db:up" (packages/server). Para um banco remoto DESCARTÁVEL, ' +
      'defina ALLOW_REMOTE_TEST_DB=true de propósito.'
  )
}
