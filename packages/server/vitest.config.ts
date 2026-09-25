import { defineConfig } from 'vitest/config'
import { assertTestDatabase, resolveTestDatabaseUrl } from './src/test/test-database.js'

// Banco descartável (npm run test:db:up) — a suíte se recusa a rodar contra
// um banco remoto/produção antes de qualquer teste.
const testDatabaseUrl = resolveTestDatabaseUrl()
assertTestDatabase(testDatabaseUrl)

const sharedTestEnv = {
  DATABASE_URL: testDatabaseUrl,
  JWT_SECRET: 'investpro-dev-jwt-secret-2024',
  JWT_REFRESH_SECRET: 'investpro-dev-refresh-secret-2024',
  NODE_ENV: 'development',
}

// Os testes de integração falam com o Postgres remoto (registro com bcrypt, várias
// idas e voltas por teste): o timeout padrão de 5 s estoura por latência quando a
// suíte inteira roda em paralelo, sem que nada esteja errado.
const sharedTimeouts = { testTimeout: 20_000, hookTimeout: 30_000 }

// Módulos com transação Prisma Serializable (order, transfer, exchange,
// portfolio/topup): sob paralelismo total de arquivos, escritas concorrentes
// contra o mesmo Supabase esgotam o retry de conflito de serialização — 409
// intermitente confirmado 3x num único dia, nada a ver com bug de lógica.
// Isolados num project próprio sem paralelismo entre arquivos; o resto da
// suíte mantém o paralelismo padrão (mais rápido, sem esse tipo de escrita).
const SERIALIZABLE_TX_MODULES = ['order', 'transfer', 'exchange', 'portfolio']
const serializableTxInclude = SERIALIZABLE_TX_MODULES.map((m) => `src/modules/${m}/**/*.test.ts`)
const defaultExclude = [...serializableTxInclude, '**/node_modules/**']

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'serializable-tx',
          ...sharedTimeouts,
          environment: 'node',
          globals: true,
          include: serializableTxInclude,
          fileParallelism: false,
          env: sharedTestEnv,
        },
      },
      {
        test: {
          name: 'default',
          ...sharedTimeouts,
          environment: 'node',
          globals: true,
          include: ['src/**/*.test.ts'],
          exclude: defaultExclude,
          env: sharedTestEnv,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/modules/**/*.service.ts', 'src/modules/**/lib/**/*.ts', 'src/modules/**/*.domain.ts'],
      exclude: ['src/modules/**/__tests__/**'],
    },
  },
})