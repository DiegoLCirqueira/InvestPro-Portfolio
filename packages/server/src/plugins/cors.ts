import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { env } from "../config/env.js";

// O navegador só entrega ao JS cross-origin os headers de resposta listados
// aqui (fora os básicos): sem isso o frontend não lê o Retry-After de um 429.
const EXPOSED_HEADERS = ["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining"];

export async function registerCors(app: FastifyInstance): Promise<void> {
  if (env.NODE_ENV === "production") {
    if (env.CORS_ORIGIN === "http://localhost:5173") {
      throw new Error(
        "CORS_ORIGIN must be explicitly set in production. " +
          "Do not use the default localhost origin."
      );
    }
    if (env.CORS_ORIGIN === "*") {
      throw new Error(
        "CORS_ORIGIN cannot be a wildcard ('*') in production when credentials: true. " +
          "Set the exact frontend origin (e.g. https://investpro.example.com)."
      );
    }
  }

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: EXPOSED_HEADERS,
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
  });
}
