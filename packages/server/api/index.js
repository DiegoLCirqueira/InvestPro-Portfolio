// @investpro/server
// Função da Vercel: todas as rotas chegam aqui (rewrite catch-all em vercel.json).
// O handler é gerado no build (npm run build:serverless, a partir de src/serverless.ts).
export { default } from '../dist-serverless/handler.js'
