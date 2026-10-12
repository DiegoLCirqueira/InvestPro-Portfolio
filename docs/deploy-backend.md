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

## 3. Banco de dados: Supabase Postgres (pós-cutover WI-20)

> **Atualizado (WI-20):** o banco de produção **não é mais** o plugin
> PostgreSQL do Railway. Após validação do cutover (dump/restore documentado
> em `infra/supabase-cutover/`), a produção passou a apontar para um projeto
> **Supabase Postgres**, e o **TCP Proxy do Railway Postgres foi desligado**
> em seguida — o plugin antigo do Railway não é mais um destino válido para
> `DATABASE_URL`.

- `DATABASE_URL` do serviço `@investpro/server` deve apontar para o
  **connection pooler do Supabase** (host `*.pooler.supabase.com`, porta
  `5432`, modo sessão), com `?sslmode=require`. **Não** referencie mais
  `${{Postgres.DATABASE_URL}}` (isso apontava para o plugin Postgres do
  próprio Railway, descontinuado neste projeto).
- O serviço Postgres do Railway ainda pode aparecer listado no projeto (não
  foi excluído), mas está **fora do caminho de produção** — seu TCP Proxy
  está desligado, então qualquer coisa apontando pra ele deixa de conectar.
- A conexão real (host/senha) fica **apenas** na variável de ambiente do
  serviço no dashboard do Railway (aba **Variables**) e nos secrets do
  Supabase — nunca neste repositório.
- Um workflow de keep-alive (`.github/workflows/supabase-keepalive.yml`) faz
  `SELECT 1` periódico no Supabase via `secrets.SUPABASE_KEEPALIVE_URL`, para
  evitar que o projeto entre em pausa por inatividade (comportamento do tier
  gratuito do Supabase).

---

## 4. Variáveis de ambiente no dashboard

Abra o serviço do backend → aba **Variables** e adicione:

| Variável | Valor recomendado |
|---|---|
| `DATABASE_URL` | Connection string do **pooler do Supabase Postgres** (`?sslmode=require`) — ver §3. Não usar mais o plugin Postgres do Railway. |
| `JWT_SECRET` | Longa e aleatória — ex.: gerada com `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | Longa e aleatória — ex.: gerada com `openssl rand -hex 64` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | Origem do frontend (ex.: `https://investpro1-five.vercel.app`) ou **várias, separadas por vírgula** (ver "Formato de `CORS_ORIGIN`" abaixo). |
| `PORT` | Opcional — o Railway injeta a própria `PORT` automaticamente |
| `FRONTEND_URL` | URL do frontend — usada para montar o link de reset de senha (WI-20). **Uma só URL**: a origem principal (com várias em `CORS_ORIGIN`, use a que deve aparecer nos e-mails). |
| `RESEND_API_KEY` | Chave da API do [Resend](https://resend.com) (WI-20, email transacional). **Precisa ser criada manualmente no painel do Resend** — não há acesso automatizado a isso. |
| `TRUST_PROXY` | Opcional — de quais peers o `X-Forwarded-For` é aceito pro IP do cliente; padrão em produção: rede interna do proxy da Railway. Ver "IP do cliente atrás do proxy" abaixo. |
| `ENABLE_API_DOCS` | Opcional — Swagger UI em `/docs`. Padrão: desligado em produção (não expor o mapa completo da API a terceiros; o site não depende dele), ligado em desenvolvimento. `true` liga em produção temporariamente. |
| `EXCHANGE_RATE_FRESH_TTL_SECONDS` | Opcional — segundos em que a cotação de câmbio é reaproveitada sem chamar a AwesomeAPI. Padrão `30` (faixa 0-300). Ver "Cotação de câmbio" abaixo. |
| `EXCHANGE_RATE_MAX_AGE_SECONDS` | Opcional — idade máxima da cotação servida do cache quando a fonte falha/limita. Padrão `120` (faixa 1-600, teto rígido; deve ser >= o TTL fresco). |
| `EXCHANGE_EXECUTE_MAX_AGE_SECONDS` | Opcional — idade máxima da cotação aceita no câmbio executado. Padrão `60` (faixa 1-600; deve ser <= `EXCHANGE_RATE_MAX_AGE_SECONDS`). |
| `EXCHANGE_RATE_MAX_DEVIATION_PERCENT` | Opcional — desvio máximo (%) de uma cotação nova em relação à última boa em cache; acima disso é rejeitada. Padrão `15` (faixa 1-100). |
| `REFRESH_ROTATE_AFTER_SECONDS` | Opcional — idade mínima do refresh token para ser rotacionado. Padrão `600` (faixa 0-900; `0` = sempre). Ver "Refresh token" abaixo. |
| `REFRESH_REUSE_GRACE_SECONDS` | Opcional — janela de tolerância de reuso do refresh token. Padrão `10` (faixa 0-30; `0` desliga). Ver "Refresh token" abaixo. |
| `PASSWORD_RESET_EMAILS_PER_HOUR` / `PASSWORD_RESET_EMAILS_PER_DAY` | Opcional — teto global de e-mails de redefinição de senha (todas as contas, contado no banco). Padrões `30` e `100`; ajuste ao limite do plano do Resend. Acima do teto o endpoint responde igual, mas não envia. |
| `RESEND_FROM_EMAIL` | Remetente dos emails (ex.: `InvestPro <no-reply@investpro.app>`). Requer domínio verificado no Resend em produção — sem isso, usar o default `onboarding@resend.dev` (limitado, não recomendado pra produção real). |

> **Importante:** a aplicação **falha na inicialização** se `NODE_ENV=production`
> e `CORS_ORIGIN` não for definida explicitamente, ou se ela for inválida (validação em
> `packages/server/src/config/corsOrigins.ts`). O valor **não** pode ser o default
> `http://localhost:5173` nem conter `*`.

### Formato de `CORS_ORIGIN` (uma ou mais origens)

- **Uma origem:** `CORS_ORIGIN=https://investpro.dev.br` (comportamento de sempre).
- **Várias:** separadas por vírgula; espaços, itens vazios e duplicatas são ignorados.
  Ex.: `CORS_ORIGIN=https://investpro1-five.vercel.app,https://investpro.dev.br`.
- **Cada item é uma origem exata**, como o navegador a envia no header `Origin`:
  esquema `http`/`https` + host [+ porta]. São recusados no boot: barra final
  (`https://x.com/`), caminho, credenciais na URL, porta padrão explícita
  (`:443`/`:80`), maiúsculas no host, esquema diferente de http/https e qualquer
  curinga (`*`, `https://*.x.com`). A mensagem de erro cita a posição do item, nunca o valor.
- **Resposta:** com mais de uma origem, `access-control-allow-origin` devolve **só a
  origem que chamou** (nunca a lista) e `access-control-allow-credentials: true`; uma
  origem fora da lista não recebe `allow-origin` e o navegador bloqueia.
- Fora de produção, `*` sozinho continua aceito (só desenvolvimento); misturado a outras
  origens é recusado.

### IP do cliente atrás do proxy (`TRUST_PROXY`)

O rate limit por IP (`/auth/*`: 5/min) depende de `request.ip`. Atrás do proxy da
Railway o socket é o IP do proxy, então, sem configuração, o limite não agrupa o
mesmo cliente e clientes distintos podem dividir um balde. `TRUST_PROXY` é a
lista (separada por vírgula) de IPs/CIDRs (ou `loopback`, `linklocal`,
`uniquelocal`) de **peers** em que o Fastify confia para ler o IP real do
`X-Forwarded-For`:

- **Padrão:** com `NODE_ENV=production`, `100.64.0.0/10,uniquelocal` (a rede
  interna dos proxies da Railway); nos demais ambientes, ninguém (desenvolvimento
  e testes ignoram `X-Forwarded-For`). `TRUST_PROXY=false` desliga explicitamente.
- **Por que faixas de rede e não `true` nem número de saltos:** `true` confia em
  todo `X-Forwarded-For` (o cliente forjaria o header para ganhar um balde novo a
  cada request). O número de saltos (`trustProxy: 1`) é **desativado no Fastify 5**
  por não validar o par imediato. Com faixas, uma conexão direta da internet
  (IP público) tem o header ignorado, e atrás do proxy vale o IP mais à direita
  fora da rede confiável, então entradas forjadas à esquerda não contam e
  qualquer número de saltos internos da Railway é absorvido.
- **Origem do `100.64.0.0/10`:** relatos da comunidade Railway, não a
  documentação oficial (que não descreve o `X-Forwarded-For`). A equipe da
  Railway afirma que reescreve o header na borda, com o IP real como primeiro
  valor, e que pode haver um salto interno extra. Se, após o deploy, o IP visto
  não for o do cliente, ajuste `TRUST_PROXY` para a faixa real dos proxies. Se um
  CDN (ex.: Cloudflare) ficar na frente, inclua também as faixas dele.
- **Como validar após o deploy:** `x-ratelimit-remaining` de logins errados
  seguidos do mesmo cliente deve decrescer (4, 3, 2, 1, 0) e a 6ª tentativa dar
  `429`. Saltos aleatórios (4, 4, 3, 4…) indicam que o proxy está fora da faixa
  confiável (cada IP de proxy vira um balde).

### Cotação de câmbio (`EXCHANGE_RATE_*`)

A AwesomeAPI responde `429` em produção e o câmbio executado (`POST /exchange/execute`)
nunca usa taxa estática, então a cotação viva tem cache curto (sem credencial nova e
sem trocar de provedor):

- **Fresca** (idade <= `EXCHANGE_RATE_FRESH_TTL_SECONDS`, padrão 30 s): reaproveitada
  sem chamar a API — é o que reduz os `429`.
- **Em falha ou `429`**: serve a última cotação **somente** se a idade for
  <= `EXCHANGE_RATE_MAX_AGE_SECONDS` (padrão 120 s, teto rígido de 600 s) e loga um
  aviso (`Cotação de câmbio servida do cache após falha da fonte`, com par, idade e
  motivo, sem dados sensíveis). Passou disso: `503` `EXCHANGE_RATE_UNAVAILABLE`.
- **`429` respeita o `Retry-After`** (padrão 30 s se ausente, máx. 5 min): durante o
  backoff a API não é chamada e o cache é servido dentro da idade máxima.
- Chamadas simultâneas ao mesmo par compartilham uma única requisição.
- **Faixa de sanidade** (`EXCHANGE_RATE_MAX_DEVIATION_PERCENT`, padrão 15%): cotação
  nova que desvia mais que isso da última boa em cache (enquanto ela tem idade <=
  `EXCHANGE_RATE_MAX_AGE_SECONDS`) é rejeitada e tratada como falha da fonte: não é
  cacheada, e o cache é servido dentro da idade máxima. Cotação não finita, zero ou
  negativa também é rejeitada. Rejeições ficam no log.
- **Câmbio executado** (`EXCHANGE_EXECUTE_MAX_AGE_SECONDS`, padrão 60 s): só aceita
  cotação com idade <= esse limite (mesmo servida do cache); mais velha => `503`.
- `/exchange/rates` e `/exchange/convert` (simulação) mantêm o fallback estático,
  marcado com `approximate: true`. Durante o backoff de um `429` eles só leem o cache
  (nunca chamam a fonte), então tráfego anônimo não prolonga o bloqueio. O cache é **por instância**: com várias réplicas,
  cada uma busca a sua.

### Refresh token: rotação preguiçosa e tolerância de reuso

- **Rotação preguiçosa** (`REFRESH_ROTATE_AFTER_SECONDS`, padrão 600 s): com um refresh
  token válido, `POST /auth/refresh` só o troca (cookie novo) se ele já tiver mais que
  isso de idade. Antes, responde `200` com um access token novo e **não mexe no
  cookie**, então recargas rápidas reusam o mesmo cookie (abortar uma resposta não
  deixa o navegador com um cookie que o servidor já rotacionou).
- **Tolerância de reuso** (`REFRESH_REUSE_GRACE_SECONDS`, padrão 10 s, máx. 30): no
  caso raro de a resposta da rotação ser abortada, reapresentar o token recém-rotacionado
  nesses segundos devolve `200` **só com um access token novo**, sem emitir outro
  refresh token e sem tocar no cookie (um token copiado e reapresentado rende apenas
  um access token de vida curta).
- **Reuso real** (token rotacionado reapresentado fora da janela, ou família sem token
  ativo — logout, troca de senha): `401` `REFRESH_TOKEN_REUSE_DETECTED`, revogando
  **só a família** daquele login (`familyId`, os descendentes da mesma sessão). As
  demais sessões do usuário (outros logins/dispositivos) seguem válidas. O evento vai
  pro log (`refresh_token_reuse_detected`, com ids e contagem, nunca o token).
- Logout, token expirado e revogação por reuso real nunca entram nas janelas acima.

### Seed: nunca em produção (e rotação das senhas antigas)

- O `prisma/seed.ts` cria uma conta de demonstração (com saldo e posições) e um ADMIN.
  Ele **não é chamado por nenhum script de start/deploy** (`railway.json`, `Dockerfile`,
  scripts do `package.json`; `prisma migrate deploy` não semeia) e **recusa rodar** com
  `NODE_ENV=production`, salvo `SEED_ALLOW_PRODUCTION=true` explícito (não recomendado).
  Só o CI o executa, contra o Postgres descartável do job, com senhas geradas na hora.
- Senhas do seed: `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD` (mínimo 12 caracteres) ou,
  se ausentes, uma senha aleatória mostrada uma única vez no console ao criar a conta.
  Conta existente nunca tem a senha alterada.
- **Admin em produção:** não use o seed. Cadastre a conta normalmente e promova o papel
  (`role = 'ADMIN'`) com um `UPDATE` controlado, com a senha vinda de um gerenciador de
  segredos.
- **Incidente (senhas antigas no histórico):** o seed antigo tinha as senhas do admin e da
  conta demo em texto puro, e o repositório é público — o valor **fica no histórico do
  git para sempre** (não reescrevemos histórico). Mitigação: **rotacione as duas senhas em
  todo lugar onde possam ter sido usadas (desenvolvimento e produção)**; se o seed já rodou
  em produção, trate as contas como comprometidas: troque a senha (ou desative a conta),
  revogue os refresh tokens e revise o que o ADMIN pode ter feito.

### Domínio próprio (investpro.dev.br)

Plano: **app** em `https://investpro.dev.br` e **API** em `https://api.investpro.dev.br`,
com os endereços antigos (`https://investpro1-five.vercel.app` e a API na `railway.app`)
**funcionando durante a migração**.

Variáveis da Railway na virada (só mude quando chegar no passo correspondente):

| Variável | Durante a transição | Depois de retirar o domínio antigo |
|---|---|---|
| `CORS_ORIGIN` | `https://investpro1-five.vercel.app,https://investpro.dev.br` | `https://investpro.dev.br` |
| `FRONTEND_URL` | `https://investpro.dev.br` (link do e-mail de reset) | igual |
| `RESEND_FROM_EMAIL` | `InvestPro <no-reply@investpro.dev.br>`, **só depois de verificar o domínio no Resend** (senão o Resend responde 403 `validation_error`) | igual |

Ordem segura:

1. **DNS:** registros do app (Vercel) e da API (`api.investpro.dev.br` → Railway) e, para o
   e-mail, os registros de verificação do Resend (SPF/DKIM).
2. **Verificação:** domínio verificado e certificado TLS ativo na Vercel, na Railway e no
   Resend (nada disso mexe no app antigo).
3. **CORS aceitando os dois:** `CORS_ORIGIN` com a origem antiga **e** a nova (e
   `FRONTEND_URL`/`RESEND_FROM_EMAIL` conforme a tabela). Redeploy da API.
4. **Troca da `VITE_API_URL` na Vercel** para `https://api.investpro.dev.br/api/v1`
   (e novo deploy do frontend). O cookie de refresh é do host da API: quem já estava logado
   precisa entrar de novo uma vez.
5. **Validação:** login, renovação de sessão (refresh), cadastro, redefinição de senha (o
   e-mail chega e o link abre em `investpro.dev.br`) e uma chamada com a origem antiga.
6. **Retirar a origem antiga** de `CORS_ORIGIN` (e desligar os endereços antigos quando
   não houver mais uso).

**Cookie (não alterado agora):** em produção o cookie de refresh usa `SameSite=None; Secure`
porque app e API estão em sites diferentes (`vercel.app` × `railway.app`). Depois de
retirar o domínio antigo, `investpro.dev.br` e `api.investpro.dev.br` são o **mesmo site**
(mesmo domínio registrável), e o cookie pode passar a `Lax`/`Strict`. Essa troca é uma
decisão à parte, para depois da migração.

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
| `P1001` / conexão recusada | `DATABASE_URL` sem `sslmode=require` ou apontando pro host errado (ex.: resquício do Railway Postgres antigo) | Confirme o host do pooler do Supabase e o `sslmode=require` |
| Boot falha com erro de CORS | `NODE_ENV=production` sem `CORS_ORIGIN` explícita, ou lista inválida (barra final, caminho, curinga, item malformado) | Defina `CORS_ORIGIN` com origens exatas separadas por vírgula (a mensagem indica o item) |
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