import { isRateLimitError } from "@/lib/rate-limit";
import { ApiError } from "@/services/api";

/**
 * Por que uma requisição falhou, do ponto de vista de quem usa:
 * - rate-limited: 429, o servidor pediu para esperar;
 * - unauthenticated: 401, a sessão acabou (vai para o login);
 * - unreachable: o resto (rede, 404 de aplicação fora do ar, 5xx): não deu para falar com o
 *   servidor agora.
 */
export type RequestFailure = "rate-limited" | "unauthenticated" | "unreachable";

export function classifyRequestFailure(error: unknown): RequestFailure {
  if (isRateLimitError(error)) return "rate-limited";
  if (error instanceof ApiError && error.status === 401) return "unauthenticated";
  return "unreachable";
}

export const SERVER_BUSY_MESSAGE =
  "O servidor está recebendo muitas requisições no momento. Sua sessão foi mantida; tente novamente.";
export const SERVER_UNREACHABLE_MESSAGE =
  "Não foi possível conectar ao servidor. Tente novamente em instantes.";
