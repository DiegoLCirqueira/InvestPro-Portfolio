import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { env } from "../config/env.js";

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
    exposedHeaders: [],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
  });
}
