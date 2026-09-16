import { buildServer } from "./server.js";
import { env } from "./config/env.js";

async function main() {
  const app = await buildServer();

  // Sem esses handlers, uma promise rejeitada sem catch (ex.: pool do Prisma
  // esgotado sob carga) derruba o processo em silêncio — Node trata rejection
  // não tratada como fatal por padrão (modo "throw") quando não há listener,
  // mas sem log nenhum do motivo. Aqui garantimos que o erro completo é
  // logado via pino antes de encerrar; continuar depois de uncaughtException
  // é inseguro (estado do processo pode estar corrompido), então sempre saímos.
  process.on("unhandledRejection", (reason) => {
    app.log.fatal(reason, "unhandledRejection: promise rejeitada sem tratamento");
    process.exit(1);
  });

  process.on("uncaughtException", (err) => {
    app.log.fatal(err, "uncaughtException: erro não tratado no processo");
    process.exit(1);
  });

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`Servidor InvestPro rodando em http://localhost:${env.PORT}`);
    app.log.info(`Documentação disponível em http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} recebido. Encerrando servidor...`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
