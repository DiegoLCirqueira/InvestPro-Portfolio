import type { FastifyInstance } from "fastify";
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from "@fastify/type-provider-zod";
import {
  riskReportListSchema,
  riskReportSchema,
} from "@investpro/shared";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { readRateLimit } from "../../shared/middleware/rateLimit.js";
import * as riskService from "./risk.service.js";

export async function riskRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.setValidatorCompiler(validatorCompiler);
  r.setSerializerCompiler(serializerCompiler);

  r.get(
    "/api/v1/risk/report",
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Risk"],
        summary: "Relatório de risco do portfólio",
        description:
          "Calcula as métricas de risco (VaR, drawdown, Sharpe, volatilidade, concentração e score) a partir do portfólio e do histórico de saldo do usuário autenticado.",
        security: [{ BearerAuth: [] }],
        response: {
          200: riskReportSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return riskService.getRiskReport(user.id);
    }
  );

  r.get(
    "/api/v1/risk/metrics",
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Risk"],
        summary: "Métricas de risco (lista)",
        description:
          "Retorna a lista de relatórios de risco. Por ora, um único report para o usuário autenticado.",
        security: [{ BearerAuth: [] }],
        response: {
          200: riskReportListSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      const report = await riskService.getRiskReport(user.id);
      return {
        items: [report],
        updatedAt: report.updatedAt,
      };
    }
  );
}
