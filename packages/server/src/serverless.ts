// @investpro/server
// Entrada da API como função serverless (Vercel). Reaproveita o buildServer()
// sem app.listen: cada invocação entrega a requisição ao servidor HTTP interno
// do Fastify. src/index.ts continua sendo a entrada pra rodar local/contêiner.

import type { IncomingMessage, ServerResponse } from "node:http";
import { buildServer } from "./server.js";

type App = Awaited<ReturnType<typeof buildServer>>;

// Montado uma vez por instância e reaproveitado enquanto a função estiver
// "quente". Se a montagem falhar, a próxima invocação tenta de novo.
let app: Promise<App> | undefined;

function getApp(): Promise<App> {
  app ??= buildServer()
    .then(async (instance) => {
      await instance.ready();
      return instance;
    })
    .catch((err: unknown) => {
      app = undefined;
      throw err;
    });
  return app;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const instance = await getApp();
  // Só resolve quando a resposta termina: a plataforma não congela a função
  // com a requisição ainda em andamento.
  await new Promise<void>((resolve) => {
    res.once("close", resolve);
    instance.server.emit("request", req, res);
  });
}
