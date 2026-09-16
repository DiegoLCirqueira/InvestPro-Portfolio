# Backup diario do Postgres do InvestPro -> Cloudflare R2.
# Roda como servico Cron Schedule no Railway, na mesma rede privada do
# Postgres (acessa via DATABASE_URL interna) - nao expoe o banco publicamente.
FROM postgres:18-alpine

RUN apk add --no-cache aws-cli bash

COPY backup.sh /backup.sh
RUN chmod +x /backup.sh

ENTRYPOINT ["/backup.sh"]
