import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { env } from "../config/env.js";

// O navegador só entrega ao JS cross-origin os headers de resposta listados
// aqui (fora os básicos): sem isso o frontend não lê o Retry-After de um 429.
const EXPOSED_HEADERS = ["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining"];

// As origens já vêm validadas (config/corsOrigins.ts). Uma só segue como string,
// como sempre foi; com mais de uma, o plugin devolve em access-control-allow-origin
// apenas a origem que chamou (nunca a lista) e nenhum header pra quem não está nela.
export async function registerCors(
  app: FastifyInstance,
  origins: readonly string[] = env.CORS_ORIGINS
): Promise<void> {
  await app.register(cors, {
    origin: origins.length === 1 ? origins[0] : [...origins],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: EXPOSED_HEADERS,
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
  });
}
