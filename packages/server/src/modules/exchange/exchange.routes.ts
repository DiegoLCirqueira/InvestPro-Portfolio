import type { FastifyInstance } from "fastify";
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from "@fastify/type-provider-zod";
import {
  currencyListResponseSchema,
  convertRequestSchema,
  convertResponseSchema,
  exchangeRateSchema,
} from "@investpro/shared";
import { CURRENCIES } from "@investpro/shared";
import { z } from "zod";
import { readRateLimit } from "../../shared/middleware/rateLimit.js";
import * as exchangeService from "./exchange.service.js";

const rateQuerySchema = z.object({
  from: z.enum(CURRENCIES),
  to: z.enum(CURRENCIES),
});

export async function exchangeRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.setValidatorCompiler(validatorCompiler);
  r.setSerializerCompiler(serializerCompiler);

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
