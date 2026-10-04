import { MIN_EXCHANGE_MESSAGE } from "@/lib/exchange";
import { MIN_ORDER_TOTAL_MESSAGE } from "@/lib/order-form";
import { isRateLimitError, rateLimitMessage } from "@/lib/rate-limit";
import { ApiError } from "@/services/api";

export const SESSION_EXPIRED_MESSAGE = "Sessão expirada. Faça login novamente.";
export const OPERATION_CONFLICT_MESSAGE =
  "Outra operação estava em andamento. Tente novamente em instantes.";
export const SERVICE_UNAVAILABLE_MESSAGE =
  "Cotação indisponível no momento. Tente novamente em instantes.";
// O servidor diz só "quantidade insuficiente"; numa venda limitada a causa pode ser outra venda
// aberta do mesmo ativo segurando parte da posição, então a mensagem aponta os dois lugares.
export const INSUFFICIENT_POSITION_MESSAGE =
  "Você não tem essa quantidade livre para vender. Confira sua posição e as vendas abertas deste ativo.";

/** Mensagem para o usuário: 401, 409, 429 e 503 ganham texto próprio; o resto vem do servidor. */
export function userMessageFor(error: Error): string {
  if (error instanceof ApiError) {
    // Mesmo texto do aviso da Nova Ordem, mesmo que o servidor mude o dele.
    if (error.code === "ORDER_TOTAL_TOO_SMALL") return MIN_ORDER_TOTAL_MESSAGE;
    if (error.code === "EXCHANGE_AMOUNT_TOO_SMALL") return MIN_EXCHANGE_MESSAGE;
    if (error.code === "ORDER_INSUFFICIENT_POSITION") return INSUFFICIENT_POSITION_MESSAGE;
    if (isRateLimitError(error)) return rateLimitMessage(error.retryAfterSeconds);
    if (error.status === 401) return SESSION_EXPIRED_MESSAGE;
    if (error.status === 409) return OPERATION_CONFLICT_MESSAGE;
    if (error.status === 503) return SERVICE_UNAVAILABLE_MESSAGE;
  }
  return error.message;
}
