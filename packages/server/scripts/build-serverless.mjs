// @investpro/server
// Empacota a entrada serverless (src/serverless.ts) num único arquivo pra a
// função da Vercel (api/index.js importa dist-serverless/handler.js).
//
// Por que bundle: o @investpro/shared (workspace) exporta TypeScript cru, com
// imports ".js" que apontam pra ".ts". No Railway quem resolvia era o tsx; na
// função da Vercel o Node não executa .ts. O esbuild embute o shared e deixa as
// dependências de node_modules externas (a Vercel rastreia e as inclui, com o
// engine do Prisma).

import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await readFile(path.join(serverDir, 'package.json'), 'utf8'))

const external = Object.keys(pkg.dependencies)
  .filter((name) => name !== '@investpro/shared')
  .flatMap((name) => [name, `${name}/*`])

await build({
  absWorkingDir: serverDir,
  entryPoints: ['src/serverless.ts'],
  outfile: 'dist-serverless/handler.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external,
  sourcemap: true,
  logLevel: 'info',
})

// A Vercel exige um diretório de saída e recusa um vazio. Só o robots.txt, que também
// pede aos robôs que não indexem a API; nada mais estático é publicado.
await mkdir(path.join(serverDir, 'public'), { recursive: true })
await writeFile(path.join(serverDir, 'public', 'robots.txt'), 'User-agent: *\nDisallow: /\n')
