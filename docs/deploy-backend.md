# Deploy do Backend na Railway (WI-017)

Deploy de produção do serviço **`@investpro/server`** (Fastify + Prisma) na
[Railway](https://railway.app), com **PostgreSQL gerenciado** — decisão de
arquitetura **D9**.

> **Atenção:** este documento cobre a **preparação e o passo a passo manual**.
> O deploy real precisa de conta/credenciais do Railway e do `git` disponível.
> Nada neste documento é executado automaticamente.

---

## 1. Visão geral

| Item | Valor |
|---|---|
| Domínio | `api.investpro...` (gerado pelo Railway) |
| Builder | Railpack (padrão da Railway para projetos novos; `railway.json` com `builder: NIXPACKS` não é mais respeitado — ver §6) |
| Serviço | `@investpro/server` em `packages/server/` |
| Build | `tsc` (output em `dist/`) |
| Start | `npx tsx dist/index.js` + `prisma migrate deploy` (não `node dist/index.js` puro — `@investpro/shared` é consumido como `.ts` bruto via `main: ./src/index.ts`, e `node` sozinho não resolve os imports `.js` que apontam para arquivos `.ts`; `tsx` resolve isso do mesmo jeito que `npm run dev`) |
| Banco | PostgreSQL gerenciado (plugin do Railway) |
| Healthcheck | `GET /health` |

---

## 2. Estratégia de monorepo (por que assim)

O InvestPro usa **npm workspaces** (`packages/*` declarados no `package.json`
da raiz). A Railway classifica isso como **monorepo compartilhado** (*shared
monorepo*): as dependências são resolvidas a partir da **raiz do repositório**.

Consequências práticas:

- **Não defina `Root Directory`** restritivo (`/packages/server`). Isso esconderia
  o root do workspace e quebraria a resolução de dependências.
- Os comandos de build/start configurados **rodam na raiz do repo** e entram em
  `packages/server` via `cd`.
- O arquivo **`packages/server/railway.json`** é lido automaticamente pela
  Railway quando o pacote é detectado (config-as-code na "raiz do pacote").

### O que cada arquivo faz

| Arquivo | Papel |
|---|---|
| `packages/server/railway.json` | Config de build/start, healthcheck, restart policy e watch paths do serviço |
| `packages/server/Dockerfile` | Alternativa de image Docker (multi-stage, `node:22-alpine`) |
| `.env.example` (raiz) | Documentação de todas as variáveis do monorepo |
| `packages/server/.env.example` | Variáveis do backend em desenvolvimento |
| `packages/server/prisma/schema.prisma` | `binaryTargets` inclui `linux-musl-openssl-3.0.x` (runtime Alpine) |
| `packages/server/package.json` | `prisma` movido para `dependencies` (necessário p/ `migrate deploy` no start) |

---

## 3. Provisionar o PostgreSQL (Railway)

Pelo **dashboard** (recomendado):

1. Abra o projeto no Railway → botão **New** → **Database** → **PostgreSQL**.
2. O Railway cria o serviço e **injeta automaticamente a variável
   `DATABASE_URL`** nos serviços que referenciam o plugin.
3. Confirme que a URL contém o parâmetro **`?sslmode=require`** (o Railway
   costuma incluir). Se não conter, anexe manualmente a `DATABASE_URL`.
4. (Alternativa CLI) `railway add -d postgresql` no projeto vinculado.

---

## 4. Variáveis de ambiente no dashboard

Abra o serviço do backend → aba **Variables** e adicione:

| Variável | Valor recomendado |
|---|---|
| `DATABASE_URL` | Referência `${{Postgres.DATABASE_URL}}` (ou a URL completa do plugin) |
| `JWT_SECRET` | Longa e aleatória — ex.: gerada com `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | Longa e aleatória — ex.: gerada com `openssl rand -hex 64` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | URL do frontend no Vercel (ex.: `https://investpro1-five.vercel.app`) |
| `PORT` | Opcional — o Railway injeta a própria `PORT` automaticamente |

> **Importante:** a aplicação **falha na inicialização** se `NODE_ENV=production`
> e `CORS_ORIGIN` não for definida explicitamente (proteção do plugin CORS em
> `packages/server/src/plugins/cors.ts`). O valor **não** pode ser o default
> `http://localhost:5173`.

Para o **frontend (Vercel)**, definir `VITE_API_URL` aponta para a URL pública do
serviço backend (ex.: `https://api.investpro.up.railway.app/api/v1`).

---

## 5. Disparar o deploy

### Opção A — git push (auto-deploy)

1. Garanta o `git` disponível localmente e publique as mudanças no repositório.
2. No Railway: **Deploy** → **GitHub Repo** → conecte o repositório
   `DiegoLCirqueira/InvestPro`.
3. Na tela de importação de monorepo JS, a Railway detecta os pacotes. Selecione
   o serviço do **backend** (`@investpro/server`) e deixe os demais (web) para o
   Vercel.
4. A Railway respeita:
   - o `packages/server/railway.json` (comandos de build/start);
   - os **watch paths** `packages/server/**`, `packages/shared/**` e
     `package-lock.json` — mudanças só no frontend **não** redeployam o backend.
5. `git push` na branch monitorada dispara o deploy.

### Opção B — Railway CLI

```bash
railway login
railway init                      # cria/vincula o projeto
railway link                      # seleciona projeto e ambiente

railway up --ci --service @investpro/server
# ou, para redeploy do último commit:
railway redeploy --from-source --service @investpro/server --yes
```

> Os comandos de build/start vêm do `railway.json`; basta rodar **a partir da
> raiz do repositório**.

---

## 6. Alternativa: Dockerfile (builder DOCKERFILE)

O `packages/server/Dockerfile` é **multi-stage** (`node:22-alpine`) e assume o
**contexto de build na raiz do repositório** (comportamento do Railway, que
clona o repo inteiro). Para usá-lo:

- **Dashboard:** Settings → Builder → **Dockerfile**, e defina a variável
  `RAILWAY_DOCKERFILE_PATH=/packages/server/Dockerfile`; **ou** via config-as-code
  `"build": { "builder": "DOCKERFILE", "dockerfilePath": "/packages/server/Dockerfile" }`.
- Tests localmente (Windows): `docker build -f packages/server/Dockerfile -t investpro-server .`

O estágio *runtime* copia `node_modules`, `dist/` e os schemas do Prisma. O
`binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` no schema garante o
engine correto para o runtime Alpine.

---

## 7. Verificação pós-deploy

1. **Healthcheck:** o serviço usa `healthcheckPath: /health` (configurado no
   `railway.json`), e a própria Railway marca o deploy como saudável.

2. Manualmente:

```bash
curl -i https://<subdomain>.up.railway.app/health
# Esperado: HTTP 200 com {"status":"ok","timestamp":"...","uptime":...}

curl https://<subdomain>.up.railway.app/docs   # Swagger UI
```

3. **Migrações:** `prisma migrate deploy` roda no `startCommand` **antes** de
   subir o servidor. Confira nos logs:

```bash
railway logs --latest --lines 200
```

4. **End-to-end:** crie um usuário via
   `POST /api/v1/auth/register` e valide o fluxo de login.

---

## 8. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `P1001` / conexão recusada | `DATABASE_URL` sem `sslmode=require` ou DB não entregue | Ajuste a URL / confirme o plugin |
| Boot falha com erro de CORS | `NODE_ENV=production` sem `CORS_ORIGIN` explícita | Defina `CORS_ORIGIN` com a URL do Vercel |
| `prisma migrate deploy` não encontrado | CLI `prisma` removida no runtime | Mantenha `prisma` em `dependencies` (já ajustado) |
| Deploy disparado sem alterar backend | Watch paths ausentes | Use `watchPatterns` do `railway.json` |
| Engine `linux-musl` faltando | Runtime Alpine sem binary target | `binaryTargets` já cobre no schema |

---

## 9. Notas de manutenção

- **Railpack (novo builder)** é o default atual. O `railway.json` usa
  **Nixpacks** (spec do WI-017). Se um dia trocar o builder para Railpack, os
  mesmos comandos de build/start continuam válidos (deteccão automática de
  workspaces).
- **Config-as-code** (`railway.json`) está deprecated e tem suporte até
  **2026-12-01**. Antes disso, planeje migrar para **Infrastructure as Code**
  do Railway mantendo os mesmos comandos aqui documentados.
- Backend e frontend têm lifecycles independentes: backend na Railway, frontend
  (Vercel) intocado por este WI.