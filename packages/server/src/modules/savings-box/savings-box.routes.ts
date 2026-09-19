import type { FastifyInstance } from "fastify";
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from "@fastify/type-provider-zod";
import {
  savingsBoxAmountInputSchema,
  savingsBoxResponseSchema,
} from "@investpro/shared";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { readRateLimit, writeRateLimit } from "../../shared/middleware/rateLimit.js";
import * as savingsBoxService from "./savings-box.service.js";

export async function savingsBoxRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.setValidatorCompiler(validatorCompiler);
  r.setSerializerCompiler(serializerCompiler);

  r.get(
    "/api/v1/savings-box",
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["SavingsBox"],
        summary: "Obter caixinha",
        description:
          "Retorna o saldo da caixinha do usuário autenticado, a taxa de rendimento simulada e o rendimento estimado (juros simples, sem compostos reais).",
        security: [{ BearerAuth: [] }],
        response: {
          200: savingsBoxResponseSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return savingsBoxService.getSavingsBox(user.id);
    }
  );

  r.post(
    "/api/v1/savings-box/deposit",
    {
      ...writeRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["SavingsBox"],
        summary: "Depositar na caixinha",
        description:
          "Move o valor do Portfolio.balance para a caixinha. Rejeita se o portfólio não tiver saldo suficiente.",
        security: [{ BearerAuth: [] }],
        body: savingsBoxAmountInputSchema,
        response: {
          200: savingsBoxResponseSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return savingsBoxService.deposit(user.id, request.body.amount);
    }
  );

  r.post(
    "/api/v1/savings-box/withdraw",
    {
      ...writeRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["SavingsBox"],
        summary: "Resgatar da caixinha",
        description:
          "Move o valor da caixinha de volta pro Portfolio.balance. Rejeita se a caixinha não tiver saldo suficiente.",
        security: [{ BearerAuth: [] }],
        body: savingsBoxAmountInputSchema,
        response: {
          200: savingsBoxResponseSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return savingsBoxService.withdraw(user.id, request.body.amount);
    }
  );
}
