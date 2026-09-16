# Backup automático do Postgres (Railway → Cloudflare R2)

Serviço Cron Schedule no Railway (mesmo projeto do Postgres, rede privada — nunca expõe o banco publicamente). Roda diariamente, gera um `pg_dump -F c` e envia para um bucket **privado** no Cloudflare R2, que expira objetos com mais de 30 dias via lifecycle rule própria do bucket.

## Por que R2 e não GitHub Releases

O dump contém dados reais de produção (email, CPF, hash de senha). GitHub Releases não tem controle de acesso granular nem retenção automática — R2 permite bucket privado com credenciais escopadas e expiração automática de objetos antigos, sem custo (free tier, sem cobrança de egress).

## Variáveis de ambiente (setar no Railway, nunca commitar)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string interna do Postgres do Railway (`${{Postgres.DATABASE_URL}}`, mesma rede privada) |
| `R2_ACCOUNT_ID` | ID da conta Cloudflare — compõe o endpoint `https://<id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | Access key de um token de API do R2 com escopo **apenas neste bucket** (Object Read & Write) |
| `R2_SECRET_ACCESS_KEY` | Secret key correspondente |
| `R2_BUCKET_NAME` | Nome do bucket privado de backups |

Nenhuma dessas variáveis é impressa em log — `backup.sh` só as referencia via env var, nunca com `echo`/`set -x`.

## Retenção

Não é responsabilidade do script — configurada como lifecycle rule no próprio bucket R2 (expira objetos com mais de 30 dias).

## Restore manual

```bash
# baixar o dump mais recente do bucket (via painel do R2 ou aws s3 cp com as mesmas credenciais)
aws s3 cp s3://<bucket>/<arquivo>.dump ./backup.dump \
  --endpoint-url https://<account_id>.r2.cloudflarestorage.com

# restaurar contra um Postgres alvo
pg_restore --clean --if-exists -d "$DATABASE_URL" ./backup.dump
```

## Criptografia em repouso

Cloudflare R2 criptografa todos os objetos em repouso por padrão (AES-256), sem configuração adicional necessária.
