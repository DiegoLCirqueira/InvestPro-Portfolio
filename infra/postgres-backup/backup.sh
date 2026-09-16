#!/bin/bash
# Backup diario do Postgres do InvestPro -> Cloudflare R2 (S3-compativel).
#
# Variaveis de ambiente esperadas (setadas no Railway, nunca em log/output):
#   DATABASE_URL         - conexao interna com o Postgres do Railway (mesma rede privada)
#   R2_ACCOUNT_ID        - id da conta Cloudflare (compoe o endpoint do R2)
#   R2_ACCESS_KEY_ID     - access key do token da API do R2 (escopo: so este bucket)
#   R2_SECRET_ACCESS_KEY - secret key correspondente
#   R2_BUCKET_NAME       - nome do bucket privado de backups
#
# Retencao: NAO e responsabilidade deste script - o bucket tem uma lifecycle
# rule no proprio R2 que expira objetos com mais de 30 dias automaticamente.
set -euo pipefail

TIMESTAMP=$(date -u +%Y-%m-%d_%H%M%SZ)
DUMP_FILE="/tmp/investpro_${TIMESTAMP}.dump"
R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

echo "[backup] iniciando pg_dump..."
pg_dump "$DATABASE_URL" -F c -f "$DUMP_FILE"
echo "[backup] dump criado: $(du -h "$DUMP_FILE" | cut -f1)"

echo "[backup] enviando pra R2 (bucket: ${R2_BUCKET_NAME})..."
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
aws s3 cp "$DUMP_FILE" "s3://${R2_BUCKET_NAME}/investpro_${TIMESTAMP}.dump" \
  --endpoint-url "$R2_ENDPOINT" \
  --no-progress

rm -f "$DUMP_FILE"
echo "[backup] concluido com sucesso: investpro_${TIMESTAMP}.dump"
