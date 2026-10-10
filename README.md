<div align="center">
  <h1>📈 InvestPro</h1>
  <p>Simulador de investimentos com operações simuladas</p>

  <a href="https://investpro.dev.br">
    <img src="https://img.shields.io/badge/Ver%20Demo-10b981?style=for-the-badge&logo=vercel&logoColor=white" alt="Demo" />
  </a>
</div>

> **Projeto de portfólio.** O InvestPro **não é uma instituição financeira**: todo o dinheiro, as ordens, o câmbio e as transferências são **simulados**. Nenhum valor real é movimentado e as sugestões do sistema são educativas, não recomendação de investimento.

---

## O que é

Um simulador para praticar investimentos com dinheiro fictício. Cada conta nova começa com **R$ 10.000,00 simulados** e pode adicionar mais saldo simulado gratuitamente. Com esse saldo, o usuário compra e vende ativos com cotações de mercado, faz câmbio, guarda dinheiro numa "Caixinha" e acompanha a evolução da carteira.

## Funcionalidades

- **Conta:** cadastro, login, sessão com renovação automática, recuperação de senha por e-mail e perfil (dados pessoais e CPF).
- **Painel:** saldo em conta, gráfico de evolução do patrimônio (7D, 30D, 90D e 1A), lista de ativos e valor total da carteira detalhado.
- **Análise de Mercado:** ações da B3, criptomoedas e renda fixa, com cotações obtidas de brapi.dev, CoinGecko e AwesomeAPI. Quando uma fonte está indisponível, o preço é marcado como estimado.
- **Ordens:** compra e venda a mercado, limitada e stop, com taxa simulada de 1%, valor mínimo por ordem, reserva de saldo e posição para ordens abertas, cancelamento e histórico com o valor efetivamente liquidado.
- **Câmbio:** conversão entre real e moedas estrangeiras, com simulação antes de confirmar.
- **Transferências simuladas:** PIX e TED (com tarifa simulada), exigindo CPF no perfil.
- **Caixinha:** reserva que rende 100% do CDI na simulação, com depósito, resgate, simulador de rendimento e extrato de movimentações. Pode completar o saldo de uma compra a mercado.
- **Diversificação:** distribuição da carteira por classe de ativo.
- **Risco:** VaR 95%, drawdown máximo, Sharpe, volatilidade e concentração da carteira.
- **Perfil de investidor e Recomendações:** questionário de 7 perguntas e sugestões geradas **por regras**, comparando a carteira com uma carteira de referência do perfil.
- **Notícias:** manchetes de feeds RSS de portais financeiros, com filtro por categoria.
- **Administração:** lista de usuários cadastrados (somente para administradores).

## Stack

Monorepo com npm workspaces:

| Pacote | Tecnologias |
|---|---|
| `packages/web` (frontend) | React 19, TypeScript, Vite 7, Tailwind CSS 4, Radix UI, React Router 7, React Hook Form + Zod, Zustand, Recharts |
| `packages/server` (API) | Node.js, Fastify 5, Prisma 6, PostgreSQL, Zod, JWT com refresh token em cookie httpOnly, bcrypt, Pino, Swagger |
| `packages/shared` | Schemas Zod e tipos compartilhados entre site e API |

**Testes:** Vitest e Testing Library (web), Vitest e Supertest com um PostgreSQL de testes em Docker (API).
**CI:** GitHub Actions (build, migrações e testes dos dois pacotes).
**Produção:** site e API na Vercel (a API como função serverless), banco PostgreSQL no Supabase. E-mails transacionais via Resend.

## Como rodar localmente

Pré-requisitos: Node.js 22 e Docker (para o PostgreSQL).

```bash
# 1. Clone e instale (o postinstall já gera o cliente do Prisma)
git clone https://github.com/DiegoLCirqueira/InvestPro.git
cd InvestPro
npm install

# 2. Suba o PostgreSQL de desenvolvimento (porta 5432)
docker compose up -d postgres

# 3. Configure as variáveis de ambiente
cp packages/server/.env.example packages/server/.env
cp packages/web/.env.example packages/web/.env
# Os valores de exemplo já apontam para o banco local e para a API em http://localhost:3001.
# Chaves das fontes de cotação (BRAPI_API_KEY) e de e-mail (RESEND_API_KEY) são opcionais em desenvolvimento.

# 4. Crie as tabelas (e, opcionalmente, os dados de demonstração)
cd packages/server
npx prisma migrate deploy
SEED_ADMIN_PASSWORD="<mínimo 12 caracteres>" SEED_USER_PASSWORD="<mínimo 12 caracteres>" npm run prisma:seed
cd ../..

# 5. Rode a API (http://localhost:3001) e o site (http://localhost:5173), em terminais separados
npm run dev --workspace=packages/server
npm run dev
```

Em desenvolvimento, a documentação da API (Swagger) fica em `http://localhost:3001/docs`.

### Contas de demonstração (seed), só em desenvolvimento

`npm run prisma:seed --workspace=packages/server` cria duas contas: uma conta de demonstração (`diego@investpro.com`, com saldo e posições) e uma conta de administrador (`admin@investpro.com`).

- **Não existe senha fixa no repositório.** A senha de cada conta vem de `SEED_USER_PASSWORD` e `SEED_ADMIN_PASSWORD` (mínimo de 12 caracteres), definidas no ambiente ou em `packages/server/.env`.
- Se a variável estiver vazia, o seed **gera uma senha aleatória** e a mostra **uma única vez** no console, só no momento em que cria a conta. Guarde-a nessa hora.
- Uma conta que já existe não tem a senha alterada.
- Em produção (`NODE_ENV=production`) o seed se recusa a rodar, salvo autorização explícita.

## Como rodar os testes

```bash
# Frontend
npm run test --workspace=packages/web

# API: sobe um PostgreSQL só de testes (Docker, porta 5433, dados em memória),
# aplica as migrações e roda a suíte contra ele
cd packages/server
npm run test:db:up
npm test
npm run test:db:down
```

Os testes da API se recusam a rodar contra um banco que não seja local: eles criam e apagam contas e abrem muitas conexões, o que pode esgotar o pool de um banco remoto e derrubar o site. Para rodar contra um banco remoto **descartável**, defina `ALLOW_REMOTE_TEST_DB=true` de propósito. **Nunca use essa opção com o banco de produção.** No CI, os testes usam o PostgreSQL do próprio runner.

**O que ainda não existe:** testes end-to-end automatizados no navegador. Hoje os fluxos completos no site publicado são verificados manualmente.

## Licença

[MIT](LICENSE)

---

<div align="center">
  Feito por <a href="https://github.com/DiegoLCirqueira">Diego Lins Cirqueira</a>
</div>
