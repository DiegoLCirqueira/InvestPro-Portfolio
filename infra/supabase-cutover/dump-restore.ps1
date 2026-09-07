# Dump (Railway) + restore (Supabase) pro cutover Rota 1 do WI-20/Supabase.
# So dados (--data-only), exclui _prisma_migrations (schema ja vem do prisma migrate deploy).
# Rodar manualmente, DEPOIS que o schema ja existir no Supabase (prisma migrate deploy)
# e DEPOIS que o backfill --apply do WI-20 ja tiver rodado no Railway (fonte).
#
# Variaveis esperadas no ambiente ANTES de rodar este script (nunca commitadas,
# nunca impressas por este script):
#   RAILWAY_DATABASE_URL  - connection string do Postgres do Railway (fonte)
#   SUPABASE_DATABASE_URL - connection string do pooler Supabase, modo sessao,
#                            porta 5432, com ?sslmode=require (destino)
#
# Exemplo de como setar antes de rodar (no seu proprio terminal, nao aqui):
#   $env:RAILWAY_DATABASE_URL  = "postgresql://..."
#   $env:SUPABASE_DATABASE_URL = "postgresql://...?sslmode=require"
#   .\dump-restore.ps1

$ErrorActionPreference = "Stop"

if (-not $env:RAILWAY_DATABASE_URL)  { throw "RAILWAY_DATABASE_URL nao esta setada." }
if (-not $env:SUPABASE_DATABASE_URL) { throw "SUPABASE_DATABASE_URL nao esta setada." }

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$dumpFile  = "investpro_cutover_data_$timestamp.dump"

Write-Output "[1/3] pg_dump --data-only do Railway -> $dumpFile"
pg_dump $env:RAILWAY_DATABASE_URL `
  --data-only `
  --format=custom `
  --exclude-table=_prisma_migrations `
  --file=$dumpFile

Write-Output "[2/3] pg_restore --data-only no Supabase"
pg_restore --data-only --disable-triggers --dbname=$env:SUPABASE_DATABASE_URL $dumpFile

Write-Output "[3/3] Concluido. Dump local: $dumpFile"
Write-Output "Rode validation.sql contra Railway (antes) e Supabase (depois) e compare as contagens antes de trocar o DATABASE_URL de producao."
Write-Output "O arquivo $dumpFile contem dados reais (email, CPF, hash de senha) -- apague depois de validar."
