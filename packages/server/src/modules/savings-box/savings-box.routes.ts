import type { FastifyInstance } from "fastify";
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from "@fastify/type-provider-zod";
import {
  savingsBoxAmountInputSchema,
  savingsBoxResponseSchema,
  savingsBoxTransactionListSchema,
  savingsBoxTransactionsQuerySchema,
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
        summary: "Obter Caixinha",
        description:
          "Retorna o saldo da Caixinha do usuário autenticado, a taxa de rendimento simulada e o rendimento estimado (juros simples, sem compostos reais).",
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
        summary: "Depositar na Caixinha",
        description:
          "Move o valor do Portfolio.balance para a Caixinha. Rejeita se o portfólio não tiver saldo suficiente.",
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
        summary: "Resgatar da Caixinha",
        description:
          "Move o valor da Caixinha de volta pro Portfolio.balance. Rejeita se a Caixinha não tiver saldo suficiente.",
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

  r.get(
    "/api/v1/savings-box/transactions",
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["SavingsBox"],
        summary: "Extrato da Caixinha",
        description:
          "Movimentos da Caixinha do usuário autenticado, mais recentes primeiro: DEPOSIT, WITHDRAW e ORDER_FUNDING (resgate automático que cobriu uma compra com useSavingsBox, com orderId). balanceAfter é o saldo da Caixinha logo depois do movimento. Paginação por cursor: passe o nextCursor da página anterior; null quando não há mais. Só registra movimentos a partir desta versão.",
        security: [{ BearerAuth: [] }],
        querystring: savingsBoxTransactionsQuerySchema,
        response: {
          200: savingsBoxTransactionListSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return savingsBoxService.listTransactions(user.id, request.query.limit, request.query.cursor);
    }
  );
}
