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
  sellableAssetListSchema,
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
          "Cria uma ordem de compra/venda (MARKET/LIMIT/STOP). MARKET é executada pelo preço atual do ativo; LIMIT/STOP ficam OPEN até atingirem o gatilho.\n\n" +
          "`useSavingsBox` (opcional, só compra): se o saldo em conta não cobre o custo (valor + taxa de 1%), resgata da Caixinha exatamente a diferença, na mesma transação da ordem, com o mesmo registro de um resgate normal. Vale só para a execução imediata (LIMIT/STOP que fica OPEN não resgata nada). Se saldo + Caixinha não bastam, responde 400 ORDER_INSUFFICIENT_BALANCE e nada muda. Em venda, `useSavingsBox: true` é recusado com 400 VALIDATION_ERROR. A resposta traz `savingsBoxUsed` (R$ resgatados; 0 se não precisou) quando `useSavingsBox` é true.\n\n" +
          "Valor mínimo por ordem: R$ 1,00 (quantidade × preço, antes da taxa), senão 400 ORDER_TOTAL_TOO_SMALL. O preço é o informado em LIMIT/STOP e o de mercado em MARKET; LIMIT/STOP que executa na hora também precisa de R$ 1,00 no total de execução. Exceção: vender a posição inteira do ativo é aceito abaixo do mínimo.\n\n" +
          "LIMIT/STOP que fica OPEN não move dinheiro, mas exige saldo em conta (compra: custo no preço informado + 1%) ou posição (venda) livres das outras ordens OPEN; senão 400 ORDER_INSUFFICIENT_BALANCE ou ORDER_INSUFFICIENT_POSITION.",
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

  r.get(
    "/api/v1/orders/sellable-assets",
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Orders"],
        summary: "Ativos disponíveis para venda",
        description:
          "Lista os tickers que o usuário autenticado tem em posição (quantity > 0) — não o catálogo completo de mercado.",
        security: [{ BearerAuth: [] }],
        response: {
          200: sellableAssetListSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return orderService.listSellableAssets(user.id);
    }
  );
}
