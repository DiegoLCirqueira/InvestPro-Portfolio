import { ApiError } from "@/services/api";

export const SESSION_EXPIRED_MESSAGE = "Sessão expirada. Faça login novamente.";
export const OPERATION_CONFLICT_MESSAGE =
  "Outra operação estava em andamento. Tente novamente em instantes.";
export const SERVICE_UNAVAILABLE_MESSAGE =
  "Cotação indisponível no momento. Tente novamente em instantes.";

/** Mensagem para o usuário: 401, 409 e 503 ganham texto próprio; o resto vem do servidor. */
export function userMessageFor(error: Error): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return SESSION_EXPIRED_MESSAGE;
    if (error.status === 409) return OPERATION_CONFLICT_MESSAGE;
    if (error.status === 503) return SERVICE_UNAVAILABLE_MESSAGE;
  }
  return error.message;
}
