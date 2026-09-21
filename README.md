<div align="center">
  <h1>📈 InvestPro</h1>
  <p>Plataforma inteligente de gestão de investimentos pessoais</p>

  <br/>

  <a href="https://investpro1-five.vercel.app">
    <img src="https://img.shields.io/badge/Ver%20Demo-10b981?style=for-the-badge&logo=vercel&logoColor=white" alt="Demo" />
  </a>

  <br/><br/>

  ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
</div>

---

## ✨ Funcionalidades

- **Dashboard** — visão geral do portfólio com gráficos e resumo financeiro
- **Análise de Mercado** — índices em tempo real e tabela de ativos com sentimento
- **Notícias** — principais notícias do mercado financeiro
- **Recomendações de IA** — sugestões personalizadas baseadas no seu perfil
- **Diversificação** — distribuição do portfólio por categoria e ativo
- **Câmbio de Moedas** — cotações e compra de moedas estrangeiras
- **Transferências Bancárias** — movimentação entre contas com histórico

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| [React 19](https://react.dev/) | Interface de usuário |
| [Vite](https://vitejs.dev/) | Bundler e dev server |
| [Tailwind CSS v4](https://tailwindcss.com/) | Estilização |
| [Recharts](https://recharts.org/) | Gráficos |
| [Lucide React](https://lucide.dev/) | Ícones |

---

## 🚀 Como rodar localmente
```bash
# Clone o repositório
git clone https://github.com/DiegoLCirqueira/InvestPro.git

# Entre na pasta
cd InvestPro

# Instale as dependências
npm install

# Rode o servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:5173` no navegador.

### Contas iniciais (seed) — só em desenvolvimento

`npm run prisma:seed --workspace=packages/server` cria a conta de demonstração
(`diego@investpro.com`) e o admin (`admin@investpro.com`). **Não existe senha fixa
no repositório**: defina `SEED_USER_PASSWORD` e `SEED_ADMIN_PASSWORD` (mínimo 12
caracteres) no ambiente ou em `packages/server/.env`, ou deixe vazio e o seed gera uma
senha aleatória e a mostra **uma única vez** no console, só quando cria a conta. Conta
que já existe não tem a senha alterada. **Nunca rode o seed em produção**: ele recusa
com `NODE_ENV=production` (o `prisma migrate reset` também o executa, só em dev).

---

## 📝 Licença

Este projeto está sob a licença [MIT](LICENSE).

---

<div align="center">
  Feito por <a href="https://github.com/DiegoLCirqueira">Diego Lins Cirqueira</a>
</div>
