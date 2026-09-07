-- Rodar contra Railway (pre-dump) e Supabase (pos-restore), comparar os dois resultados.
-- Ver infra/supabase-cutover/dump-restore.ps1 e a nota Maestri "WI-20-Supabase - Plano DevOps".

-- 1) contagem por tabela
SELECT 'User' t, count(*) FROM "User"
UNION ALL SELECT 'BankAccount', count(*) FROM "BankAccount"
UNION ALL SELECT 'Order', count(*) FROM "Order"
UNION ALL SELECT 'Portfolio', count(*) FROM "Portfolio"
UNION ALL SELECT 'Position', count(*) FROM "Position"
UNION ALL SELECT 'PasswordResetToken', count(*) FROM "PasswordResetToken"
UNION ALL SELECT 'RefreshToken', count(*) FROM "RefreshToken"
UNION ALL SELECT 'Transfer', count(*) FROM "Transfer";

-- 2) indices (diff textual entre os dois outputs)
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname;

-- 3) os 7 enums
SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid ORDER BY t.typname, e.enumsortorder;

-- 4) FKs/onDelete
SELECT conname, conrelid::regclass AS tabela, confrelid::regclass AS referencia, confdeltype
FROM pg_constraint WHERE contype = 'f' ORDER BY conname;

-- 5) emails normalizados (deve dar 0 nos dois lados, ja que o backfill roda antes do dump)
SELECT count(*) FROM "User" WHERE email <> lower(trim(email));
