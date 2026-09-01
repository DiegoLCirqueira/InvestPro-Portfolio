import type { FastifyInstance } from "fastify";
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from "@fastify/type-provider-zod";
import { z } from "zod";
import {
  createOrderInputSchema,
  orderListSchema,
  orderSchema,
} from "@investpro/shared";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { readRateLimit, writeRateLimit } from "../../shared/middleware/rateLimit.js";
import * as orderService from "./order.service.js";

const orderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.setValidatorCompiler(validatorCompiler);
  r.setSerializerCompiler(serializerCompiler);

  r.post(
    "/api/v1/orders",
    {
      ...writeRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Orders"],
        summary: "Criar ordem",
        description:
          "Cria uma ordem de compra/venda (MARKET/LIMIT/STOP). MARKET é executada pelo preço atual do ativo; LIMIT/STOP ficam OPEN até atingirem o gatilho.",
        security: [{ BearerAuth: [] }],
        body: createOrderInputSchema,
        response: {
          200: orderSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return orderService.createOrder(user.id, request.body);
    }
  );

  r.get(
    "/api/v1/orders",
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Orders"],
        summary: "Listar ordens",
        description: "Lista as ordens do usuário autenticado, com paginação.",
        security: [{ BearerAuth: [] }],
        querystring: orderListQuerySchema,
        response: {
          200: orderListSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return orderService.listOrders(user.id, request.query.page, request.query.limit);
    }
  );
}
