import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { env } from "./config/env.js";
import { registerSwagger } from "./plugins/swagger.js";
import { registerCors } from "./plugins/cors.js";
import { registerSecurity } from "./plugins/security.js";
import { registerErrorHandler } from "./plugins/errors.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { userRoutes } from "./modules/user/user.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { portfolioRoutes } from "./modules/portfolio/portfolio.routes.js";
import { marketRoutes } from "./modules/market/market.routes.js";
import { newsRoutes } from "./modules/news/news.routes.js";
import { riskRoutes } from "./modules/risk/risk.routes.js";
import { orderRoutes } from "./modules/order/order.routes.js";
import { exchangeRoutes } from "./modules/exchange/exchange.routes.js";
import { transferRoutes } from "./modules/transfer/transfer.routes.js";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      // Defesa em profundidade: hoje o serializer padrão do Fastify não inclui
      // req.body no log (confirmado pelo AppSec), mas se algum log futuro vier
      // a expor a request completa, senha e CPF nunca aparecem em texto puro.
      redact: {
        paths: ["req.body.password", "req.body.cpf"],
        remove: true,
      },
      transport:
        env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  await app.register(cookie);
  await registerCors(app);
  await registerSecurity(app);
  await registerSwagger(app);
  await registerErrorHandler(app);

  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(adminRoutes);
  await app.register(portfolioRoutes);
  await app.register(marketRoutes);
  await app.register(newsRoutes);
  await app.register(riskRoutes);
  await app.register(orderRoutes);
  await app.register(exchangeRoutes);
  await app.register(transferRoutes);

  app.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  return app;
}
