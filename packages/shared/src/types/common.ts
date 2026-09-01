// @investpro/shared
// Tipos comuns do contrato compartilhado.

/** Envelope padrão de erro usado pelo handler de AppError do backend. */
export interface ApiErrorEnvelope {
  error: string;
  message: string;
  statusCode?: number;
  details?: unknown;
}

/**
 * Formato padrão de resposta da API.
 * Para sucesso o backend retorna `{ data, ... }`; para erros retorna
 * o envelope `ApiErrorEnvelope` (`{ error, message }`).
 */
export type ApiEnvelope<T = unknown> =
  | { error: string; message: string; statusCode?: number; details?: unknown }
  | { data: T };

/** Paginação baseada em cursor. */
export interface Pagination<T> {
  items: T[];
  cursor?: string | null;
  hasMore: boolean;
}

/** Apenas presentes em respostas paginadas. */
export interface PaginationQuery {
  cursor?: string;
  limit?: number;
}