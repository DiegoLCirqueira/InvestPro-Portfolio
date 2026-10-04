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

// O plugin @fastify/rate-limit gera o texto em inglês; o code, o status e os headers
// (Retry-After em segundos, x-ratelimit-*) ficam como o plugin os setou.
function rateLimitMessage(retryAfter: number | string | string[] | undefined): string {
  const seconds = Math.ceil(Number(retryAfter));
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Muitas requisições. Tente novamente em alguns instantes.";
  }
  return `Muitas requisições. Tente novamente em ${seconds} ${seconds === 1 ? "segundo" : "segundos"}.`;
}

// Issue de validação no formato do @fastify/type-provider-zod.
interface ValidationIssue {
  keyword?: string;
  instancePath?: string;
  message?: string;
  params?: { keys?: string[] };
}

// Mensagens padrão do Zod v4 (locale en) começam assim e trazem detalhe interno
// (tipos, lista de valores aceitos). As escritas no shared (refine, .max com
// mensagem) são em pt-BR pro usuário e passam como estão.
const ZOD_DEFAULT_MESSAGE = /^(Invalid|Too (big|small)|Unrecognized)\b/;

function issueFields(issue: ValidationIssue): string[] {
  if (issue.keyword === "unrecognized_keys" && issue.params?.keys) return issue.params.keys;
  const field = (issue.instancePath ?? "").split("/").filter(Boolean).join(".");
  return field ? [field] : [];
}

// Resposta curta em pt-BR: as mensagens escritas por nós + os campos com erro
// genérico ("Dados inválidos: ticker"). O detalhe completo fica só no log.
export function validationMessage(issues: readonly ValidationIssue[]): string {
  const authored = new Set<string>();
  const fields = new Set<string>();
  for (const issue of issues) {
    if (issue.message && !ZOD_DEFAULT_MESSAGE.test(issue.message)) authored.add(issue.message);
    else issueFields(issue).forEach((field) => fields.add(field));
  }
  const parts = [...authored];
  if (fields.size > 0) parts.push(`Dados inválidos: ${[...fields].join(", ")}`);
  return parts.length > 0 ? parts.join("; ") : "Dados inválidos";
}

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
      return sendError(reply, 429, "RATE_LIMIT_EXCEEDED", rateLimitMessage(reply.getHeader("retry-after")));
    }

    // Validação do schema (Zod/Fastify), parse de corpo inválido ou mídia:
    // devem responder 400, e não 500.
    if (
      statusCode === 400 ||
      err.validation ||
      err.validationContext ||
      (code !== undefined && VALIDATION_CODES.includes(code))
    ) {
      if (!Array.isArray(err.validation)) {
        return sendError(reply, 400, "VALIDATION_ERROR", message);
      }
      request.log.info(
        { validation: err.validation, validationContext: err.validationContext },
        "requisição recusada na validação"
      );
      return sendError(reply, 400, "VALIDATION_ERROR", validationMessage(err.validation));
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
