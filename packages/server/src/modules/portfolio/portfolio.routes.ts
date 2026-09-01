import type { FastifyInstance } from "fastify";
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from "@fastify/type-provider-zod";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { readRateLimit } from "../../shared/middleware/rateLimit.js";
import {
  historyQuerySchema,
  portfolioResponseSchema,
  historyResponseSchema,
  diversificationResponseSchema,
} from "./portfolio.schema.js";
import * as portfolioService from "./portfolio.service.js";

export async function portfolioRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.setValidatorCompiler(validatorCompiler);
  r.setSerializerCompiler(serializerCompiler);

  r.get(
    "/api/v1/portfolio",
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Portfolio"],
        summary: "Obter portfólio",
        description:
          "Retorna o portfólio do usuário autenticado com todas as posições.",
        security: [{ BearerAuth: [] }],
        response: {
          200: portfolioResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string };
      return portfolioService.getPortfolio(user.id);
    }
  );

  r.get(
    "/api/v1/portfolio/history",
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Portfolio"],
        summary: "Histórico de saldo",
        description:
          "Retorna a série temporal do saldo do portfólio no período informado.",
        security: [{ BearerAuth: [] }],
        querystring: historyQuerySchema,
        response: {
          200: historyResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string };
      return portfolioService.getHistory(user.id, request.query as { period: "7d" | "30d" | "90d" | "1y" });
    }
  );

  r.get(
    "/api/v1/portfolio/diversification",
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Portfolio"],
        summary: "Diversificação do portfólio",
        description:
          "Retorna a composição do portfólio por tipo de ativo.",
        security: [{ BearerAuth: [] }],
        response: {
          200: diversificationResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string };
      return portfolioService.getDiversification(user.id);
    }
  );
}
