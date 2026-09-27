import type { FastifyInstance } from "fastify";
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from "@fastify/type-provider-zod";
import { personalizedRecommendationsResponseSchema } from "@investpro/shared";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { readRateLimit } from "../../shared/middleware/rateLimit.js";
import * as recommendationsService from "./recommendations.service.js";

export async function recommendationsRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.setValidatorCompiler(validatorCompiler);
  r.setSerializerCompiler(serializerCompiler);

  r.get(
    "/api/v1/recommendations",
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Recommendations"],
        summary: "Recomendações pelo perfil de investidor",
        description:
          "Compara a carteira do usuário autenticado com a carteira de referência do seu perfil de investidor e devolve sugestões (regras determinísticas, conteúdo educativo).",
        security: [{ BearerAuth: [] }],
        response: {
          200: personalizedRecommendationsResponseSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return recommendationsService.getRecommendations(user.id);
    }
  );
}
