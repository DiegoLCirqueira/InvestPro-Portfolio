import type { FastifyInstance, FastifyReply } from "fastify";
import { AppError } from "../modules/auth/auth.service.js";

// Códigos de erro que o Fastify usa para falhas de validação/serialização/parse.
const VALIDATION_CODES: readonly string[] = [
  "FST_ERR_VALIDATION",
  "FST_ERR_CTP_INVALID_MEDIA_TYPE",
  "FST_ERR_CTP_EMPTY_JSON_BODY",
  "FST_ERR_CTP_INVALID_JSON_BODY",
  "FST_ERR_JSON_BODY_INVALID",
  "FST_ERR_VALIDATION_TIMEOUT",
];

interface ErrorLike {
  code?: string;
  message?: string;
  statusCode?: number;
  validation?: unknown;
  validationContext?: string;
  headers?: Record<string, string | number>;
}

function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  headers?: Record<string, string | number>
): FastifyReply {
  if (headers) reply.headers(headers);
  return reply.status(statusCode).send({ error: code, message });
}

/**
 * Handler de erro central (registrado uma única vez no app).
 *
 * Responsável pelo mapeamento consistente dos status HTTP:
 *  - AppError (negócio)  -> usa error.statusCode + {error: code, message}
 *  - validação/inválido  -> 400
 *  - rate limit           -> 429 + header Retry-After
 *  - rota não encontrada  -> 404
 *  - qualquer outro       -> 500 {error: INTERNAL_SERVER_ERROR}
 */
export async function registerErrorHandler(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error, request, reply) => {
    if (reply.sent) return reply;

    // Erros de negócio (AppError): usam o statusCode e o shape {error, message}.
    if (error instanceof AppError) {
      return sendError(reply, error.statusCode, error.code, error.message);
    }

    const err = (error ?? {}) as ErrorLike;
    const code = err.code;
    const statusCode = err.statusCode;
    const message = err.message || "Erro desconhecido";

    // Rate limit atingido: o plugin @fastify/rate-limit já setou o header
    // Retry-After (e x-ratelimit-*) na reply antes de lançar o erro.
    if (statusCode === 429) {
      return sendError(reply, 429, "RATE_LIMIT_EXCEEDED", message);
    }

    // Validação do schema (Zod/Fastify), parse de corpo inválido ou mídia:
    // devem responder 400, e não 500.
    if (
      statusCode === 400 ||
      err.validation ||
      err.validationContext ||
      (code !== undefined && VALIDATION_CODES.includes(code))
    ) {
      const validationMessage = err.validation
        ? `${message}; ${JSON.stringify(err.validation)}`
        : message;
      return sendError(reply, 400, "VALIDATION_ERROR", validationMessage);
    }

    // Rota inexistente cai aqui quando a requisição falha com 404.
    if (statusCode === 404) {
      return sendError(reply, 404, "NOT_FOUND", message);
    }

    // Erro inesperado: 500 com shape consistente.
    request.log.error({ err: error }, "Erro não tratado pelo error handler");
    return sendError(reply, 500, "INTERNAL_SERVER_ERROR", "Erro interno do servidor");
  });

  // 404 de rotas inexistentes (Fastify dispatches para o notFoundHandler).
  app.setNotFoundHandler((request, reply) => {
    return sendError(
      reply,
      404,
      "NOT_FOUND",
      `Rota não encontrada: ${request.method} ${request.url}`
    );
  });
}
