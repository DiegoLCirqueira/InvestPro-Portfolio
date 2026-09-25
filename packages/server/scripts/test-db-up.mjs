// @investpro/server
// Sobe e prepara o banco SÓ de testes (serviço postgres-test do docker-compose,
// porta 5433, dados em memória): migrations + seed, igual ao job do CI.
//
// Uso (em packages/server):
//   npm run test:db:up     sobe/recria o banco e prepara
//   npm test               roda a suíte contra ele (padrão do vitest.config.ts)
//   npm run test:db:down   derruba (os dados somem: são em memória)
//
// As senhas das contas do seed são geradas aqui a cada execução (o seed exige
// senha por env e não há senha fixa no repositório) e não são impressas.

import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const composeFile = path.resolve(serverDir, '../../docker-compose.yml')
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/investpro_test?schema=public'

// npx é um .cmd no Windows e precisa de shell; docker é executável e roda sem
// shell, o que preserva o caminho do compose (que pode ter espaços).
function run(label, command, args, env = {}) {
  console.log(`\n> ${label}`)
  const result = spawnSync(command, args, {
    cwd: serverDir,
    stdio: 'inherit',
    shell: process.platform === 'win32' && command === 'npx',
    env: { ...process.env, ...env },
  })
  if (result.status !== 0) {
    console.error(`\nFalhou: ${label}`)
    process.exit(result.status ?? 1)
  }
}

const dbEnv = { DATABASE_URL: TEST_DATABASE_URL }

run('Subindo o Postgres de testes (docker compose)', 'docker', [
  'compose', '-f', composeFile, 'up', '-d', '--wait', 'postgres-test',
])
run('Aplicando migrations', 'npx', ['prisma', 'migrate', 'deploy'], dbEnv)
run('Rodando o seed', 'npx', ['tsx', 'prisma/seed.ts'], {
  ...dbEnv,
  SEED_USER_PASSWORD: randomBytes(24).toString('base64'),
  SEED_ADMIN_PASSWORD: randomBytes(24).toString('base64'),
})

console.log('\nBanco de testes pronto. Rode: npm test')
