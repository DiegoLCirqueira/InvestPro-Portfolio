// @investpro/server
// WI-20 Parte 2 — backfill de normalização de email (trim + lowercase) para
// contas já cadastradas antes do fix em auth.schema.ts (que só normaliza
// email em NOVAS requisições, não corrige o que já está no banco).
//
// Procedimento AppSec: transacional, com tabela de auditoria (email antigo
// preservado) e sem alterar schema/índice — User.email continua
// String @unique com colation case-sensitive padrão; como tudo passa a ser
// minúsculo, a unicidade case-sensitive já não gera falso-negativo.
//
// Uso:
//   node scripts/backfill-normalize-emails.mjs             (dry-run — só lista candidatos, não escreve nada)
//   node scripts/backfill-normalize-emails.mjs --apply      (aplica de verdade, dentro de UMA transação)
//
// Se algum par de emails colidir depois de normalizado (dois usuários que só
// diferem por case/espaço), o UPDATE do segundo viola a unique constraint de
// User.email e o Postgres aborta a transação inteira automaticamente — nada
// fica parcialmente aplicado. É o comportamento desejado: colisão para tudo
// e volta pro humano decidir caso a caso (não é pra rodar de novo sem
// investigar).
//
// Reversão manual (usa a tabela de auditoria criada por este script):
//   UPDATE "User" u SET email = a.old_email
//   FROM email_backfill_audit a
//   WHERE u.id = a.user_id;
//
// NUNCA rodar --apply contra a DATABASE_URL de produção sem autorização
// explícita do usuário, mesmo com a auditoria de colisão (0 encontradas) já
// aprovada — este script só decide o QUE fazer, não substitui a autorização
// de QUANDO/ONDE rodar.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

async function main() {
  const candidates = await prisma.$queryRawUnsafe(`
    SELECT id, email, lower(trim(email)) AS normalized
    FROM "User"
    WHERE email <> lower(trim(email))
    ORDER BY email
  `)

  console.log(`Candidatos a normalizar: ${candidates.length}`)
  for (const row of candidates) {
    console.log(`  ${row.id}: "${row.email}" -> "${row.normalized}"`)
  }

  if (!APPLY) {
    console.log('\nDry-run (padrão) — nenhuma escrita feita. Rode com --apply para aplicar de verdade.')
    return
  }

  if (candidates.length === 0) {
    console.log('\nNada a normalizar.')
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "email_backfill_audit" (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        old_email TEXT NOT NULL,
        new_email TEXT NOT NULL,
        migrated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    for (const row of candidates) {
      await tx.$executeRawUnsafe(
        `INSERT INTO "email_backfill_audit" (user_id, old_email, new_email) VALUES ($1, $2, $3)`,
        row.id,
        row.email,
        row.normalized
      )
      await tx.$executeRawUnsafe(`UPDATE "User" SET email = $1 WHERE id = $2`, row.normalized, row.id)
    }
  })

  console.log(`\n${candidates.length} email(s) normalizados e registrados em "email_backfill_audit".`)
}

main()
  .catch((err) => {
    console.error('\nFALHOU (transação revertida, nada foi aplicado):', err.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
