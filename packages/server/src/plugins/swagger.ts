import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "@fastify/type-provider-zod";
import { env } from "../config/env.js";

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
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: env.NODE_ENV === "production" ? "Produção" : "Desenvolvimento",
        },
      ],
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
