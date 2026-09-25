import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "@fastify/type-provider-zod";

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    transform: jsonSchemaTransform,
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "InvestPro API",
        description: "API do InvestPro — Plataforma de Investimentos Financeiros",
        version: "0.1.0",
      },
      // Relativo ao host que serve a spec: vale em localhost e em produção.
      servers: [{ url: "/" }],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Token JWT de autenticação",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });
}
