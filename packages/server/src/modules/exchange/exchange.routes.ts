import type { FastifyInstance } from "fastify";
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from "@fastify/type-provider-zod";
import {
  currencyHoldingListSchema,
  currencyListResponseSchema,
  convertRequestSchema,
  convertResponseSchema,
  exchangeRateSchema,
  executeExchangeInputSchema,
  executeExchangeResponseSchema,
} from "@investpro/shared";
import { CURRENCIES } from "@investpro/shared";
import { z } from "zod";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { readRateLimit, writeRateLimit } from "../../shared/middleware/rateLimit.js";
import * as exchangeService from "./exchange.service.js";
import { configureLogger } from "./exchange.rates.js";

const rateQuerySchema = z.object({
  from: z.enum(CURRENCIES),
  to: z.enum(CURRENCIES),
});

export async function exchangeRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.setValidatorCompiler(validatorCompiler);
  r.setSerializerCompiler(serializerCompiler);
  configureLogger(app.log);

  r.get(
    "/api/v1/exchange/rates",
    {
      ...readRateLimit,
      schema: {
        tags: ["Exchange"],
        summary: "Taxa de câmbio",
        description:
          "Retorna a taxa de conversão entre duas moedas (fonte AwesomeAPI com fallback estático).",
        querystring: rateQuerySchema,
        response: {
          200: exchangeRateSchema,
        },
      },
    },
    async (request) => {
      return exchangeService.getRate(request.query.from, request.query.to);
    }
  );

  r.post(
    "/api/v1/exchange/convert",
    {
      ...readRateLimit,
      schema: {
        tags: ["Exchange"],
        summary: "Converter moeda",
        description:
          "Converte um valor entre duas moedas, aplicando uma fee de 1% sobre o valor de origem.",
        body: convertRequestSchema,
        response: {
          200: convertResponseSchema,
        },
      },
    },
    async (request) => {
      return exchangeService.convert(request.body.from, request.body.to, request.body.amount);
    }
  );

  r.post(
    "/api/v1/exchange/execute",
    {
      ...writeRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Exchange"],
        summary: "Executar câmbio",
        description:
          "Converte de verdade: debita `from` (BRL do Portfolio.balance, ou a moeda do CurrencyHolding) e credita `to`, com a fee de 1% já aplicada. Diferente de /convert (que só calcula). Mínimo de R$ 1,00 por conversão (a origem é avaliada em BRL pela cotação usada); abaixo disso, 400 EXCHANGE_AMOUNT_TOO_SMALL.",
        security: [{ BearerAuth: [] }],
        body: executeExchangeInputSchema,
        response: {
          200: executeExchangeResponseSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return exchangeService.executeExchange(
        user.id,
        request.body.from,
        request.body.to,
        request.body.amount
      );
    }
  );

  r.get(
    "/api/v1/exchange/holdings",
    {
      ...readRateLimit,
      preHandler: [authenticate],
      schema: {
        tags: ["Exchange"],
        summary: "Saldos por moeda",
        description:
          "Retorna os saldos em moeda estrangeira (CurrencyHolding) do usuário autenticado — só moedas com saldo positivo, ordenadas por moeda. O saldo em BRL fica em /portfolio.",
        security: [{ BearerAuth: [] }],
        response: {
          200: currencyHoldingListSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as { id: string };
      return exchangeService.listHoldings(user.id);
    }
  );

  r.get(
    "/api/v1/exchange/currencies",
    {
      ...readRateLimit,
      schema: {
        tags: ["Exchange"],
        summary: "Lista de moedas",
        description: "Retorna a lista de moedas suportadas.",
        response: {
          200: currencyListResponseSchema,
        },
      },
    },
    async () => {
      return exchangeService.listCurrencies("BRL");
    }
  );
}
