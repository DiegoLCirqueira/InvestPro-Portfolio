<div align="center">
  <h1>📈 InvestPro</h1>
  <p>Simulador de investimentos com operações simuladas</p>

  <a href="https://investpro.dev.br">
    <img src="https://img.shields.io/badge/Ver%20Demo-10b981?style=for-the-badge&logo=vercel&logoColor=white" alt="Demo" />
  </a>
</div>

> **No ar em [investpro.dev.br](https://investpro.dev.br).** Crie uma conta gratuita e teste tudo pelo site: cadastro, login, ordens, câmbio, PIX, Caixinha e relatórios de risco. Este repositório existe para mostrar o código.
>
> **Projeto de portfólio.** O InvestPro **não é uma instituição financeira**: todo o dinheiro, as ordens, o câmbio e as transferências são **simulados**. Nenhum valor real é movimentado e as sugestões do sistema são educativas, não recomendação de investimento.

---

## O que é

Um simulador para praticar investimentos com dinheiro fictício. Cada conta nova começa com **R$ 10.000,00 simulados** e pode adicionar mais saldo simulado gratuitamente. Com esse saldo, o usuário compra e vende ativos com cotações de mercado, faz câmbio, guarda dinheiro numa "Caixinha" e acompanha a evolução da carteira.

## Funcionalidades

- **Conta:** cadastro, login, sessão com renovação automática, recuperação de senha por e-mail (com limite global de envios por hora e por dia) e perfil (dados pessoais e CPF).
- **Painel:** saldo em conta, gráfico de evolução do patrimônio (7D, 30D, 90D e 1A), lista de ativos e valor total da carteira detalhado.
- **Análise de Mercado:** ações da B3, criptomoedas e renda fixa, com cotações obtidas de brapi.dev, CoinGecko e AwesomeAPI. Quando uma fonte está indisponível, o preço é marcado como estimado.
- **Ordens:** compra e venda a mercado, limitada e stop, com taxa simulada de 1%, valor mínimo por ordem, reserva de saldo e posição para ordens abertas, cancelamento e histórico com o valor efetivamente liquidado.
- **Câmbio:** conversão entre real e moedas estrangeiras, com simulação antes de confirmar.
- **Transferências simuladas:** PIX e TED (com tarifa simulada), exigindo CPF no perfil. No PIX o usuário digita só os números: a tela reconhece se a chave é celular, CPF ou CNPJ e pergunta quando a chave pode ser as duas coisas.
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

**Testes:** Vitest e Testing Library (web), Vitest com testes de rota contra um PostgreSQL de testes em Docker (API).
**CI:** GitHub Actions (build, migrações e testes dos dois pacotes).
**Produção:** site e API na Vercel (a API como função serverless), banco PostgreSQL no Supabase. E-mails transacionais via Resend.

## Onde olhar no código

| Assunto | Caminho |
|---|---|
| Regras de negócio das ordens (reserva de saldo e posição, taxa, mínimos) | `packages/server/src/modules/order/` |
| Transferências e reconhecimento de chave PIX | `packages/server/src/modules/transfer/` e `packages/shared/src/transfer/` |
| Contratos compartilhados entre site e API (schemas Zod) | `packages/shared/src/` |
| Modelo de dados e migrações | `packages/server/prisma/` |
| Decisões de arquitetura | `docs/adr/` |

Cada módulo da API separa rotas (`*.routes.ts`), serviço (`*.service.ts`) e regras puras (`*.domain.ts`). As regras puras são testadas sem banco de dados.

## Qualidade

- **147 arquivos de teste** (Vitest e Testing Library no site; na API, Vitest com testes de rota contra um PostgreSQL de testes em Docker).
- **CI no GitHub Actions** a cada push: build, migrações, testes dos dois pacotes e varredura de segredos com gitleaks.
- **Segurança:** senhas com bcrypt, refresh token em cookie httpOnly com rotação, rate limit por rota, CORS restrito e headers de segurança (Helmet).

Para rodar localmente, os arquivos `.env.example` em `packages/server` e `packages/web` listam as variáveis, e o `docker-compose.yml` sobe o PostgreSQL.

## Status

Projeto concluído em outubro de 2026 e no ar em [investpro.dev.br](https://investpro.dev.br).

## Licença

[MIT](LICENSE)

---

<div align="center">
  Feito por <a href="https://github.com/DiegoLCirqueira">Diego Lins Cirqueira</a>
</div>
