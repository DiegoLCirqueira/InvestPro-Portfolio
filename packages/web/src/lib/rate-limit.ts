import { ApiError } from "@/services/api";

const SECONDS_PER_MINUTE = 60;

// RATE_LIMIT_EXCEEDED (por IP) e ACCOUNT_RATE_LIMITED (por conta) chegam sempre como 429.
type RateLimitError = ApiError & { readonly status: 429 };

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof ApiError && error.status === 429;
}

function formatWait(seconds: number): string {
  if (seconds < SECONDS_PER_MINUTE) return seconds === 1 ? "1 segundo" : `${seconds} segundos`;
  const minutes = Math.ceil(seconds / SECONDS_PER_MINUTE);
  return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
}

/** Texto próprio (pt-BR): nunca repassa o do servidor. Sem Retry-After legível, não inventa prazo. */
export function rateLimitMessage(retryAfterSeconds?: number): string {
  const wait =
    retryAfterSeconds !== undefined && retryAfterSeconds > 0
      ? `em ${formatWait(Math.ceil(retryAfterSeconds))}`
      : "em alguns instantes";
  return `Muitas tentativas. Tente novamente ${wait}.`;
}

/** Mensagem de um ApiError para a tela: limite de tentativas ganha o texto acima; o resto vem do servidor. */
export function apiErrorMessage(error: ApiError): string {
  return isRateLimitError(error) ? rateLimitMessage(error.retryAfterSeconds) : error.message;
}
