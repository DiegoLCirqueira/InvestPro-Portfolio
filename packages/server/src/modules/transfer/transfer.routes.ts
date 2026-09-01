import type { FastifyInstance } from "fastify";
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from "@fastify/type-provider-zod";
import { z } from "zod";
import {
  createTransferInputSchema,
  transferListSchema,
  transferSchema,
} from "@investpro/shared";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { readRateLimit, writeRateLimit } from "../../shared/middleware/rateLimit.js";
import * as transferService from "./transfer.service.js";

const transferListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function transferRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.setValidatorCompiler(validatorCompiler);
  r.setSerializerCompiler(serializerCompiler);

  r.post(
    "/api/v1/transfers",
    {
      ...writeRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Transfers"],
        summary: "Criar transferência",
        description:
          "Cria uma transferência bancária (PIX/TED/DOC) para o usuário autenticado.",
        security: [{ BearerAuth: [] }],
        body: createTransferInputSchema,
        response: {
          200: transferSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return transferService.createTransfer(user.id, request.body);
    }
  );

  r.get(
    "/api/v1/transfers",
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Transfers"],
        summary: "Listar transferências",
        description: "Lista as transferências do usuário autenticado, com paginação.",
        security: [{ BearerAuth: [] }],
        querystring: transferListQuerySchema,
        response: {
          200: transferListSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return transferService.listTransfers(user.id, request.query.page, request.query.limit);
    }
  );
}
