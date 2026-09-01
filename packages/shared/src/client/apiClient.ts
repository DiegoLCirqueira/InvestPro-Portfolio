// @investpro/shared
// Client de rede reutilizável e agnóstico de framework, baseado em fetch.

import type { ApiErrorEnvelope } from '../types/common.js';

/** Opções de criação do client de rede. */
export interface ApiClientOptions {
  baseURL: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
  credentials?: RequestCredentials;
}

/** Interface do client de rede produzida por createApiClient. */
export interface ApiClient {
  get<T>(path: string, signal?: AbortSignal): Promise<T>;
  post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T>;
  patch<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T>;
  delete<T>(path: string, signal?: AbortSignal): Promise<T>;
}

/** Erro tipado lançado pelo apiClient em respostas não-2xx. */
export class ApiError extends Error {
  readonly status: number;
  readonly envelope: ApiErrorEnvelope;

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.message ?? envelope.error ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.envelope = envelope;
  }
}

function buildUrl(baseURL: string, path: string): string {
  const normalizedBase = baseURL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function parseEnvelope(response: Response): Promise<ApiErrorEnvelope> {
  let envelope: ApiErrorEnvelope = {
    error: 'http_error',
    message: `HTTP ${response.status}`,
  };

  try {
    const body = (await response.json()) as Partial<ApiErrorEnvelope>;
    if (typeof body.error === 'string') envelope.error = body.error;
    if (typeof body.message === 'string') envelope.message = body.message;
    if (body.statusCode !== undefined) envelope.statusCode = body.statusCode;
    if (body.details !== undefined) envelope.details = body.details;
  } catch {
    // corpo não-JSON: mantém o envelope padrão
  }

  return envelope;
}

/**
 * Cria um client HTTP tipado com fetch.
 * Aguenta Authorization via getToken e dispara onUnauthorized em 401.
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseURL = options.baseURL;
  const getToken = options.getToken;
  const onUnauthorized = options.onUnauthorized;
  const credentials = options.credentials ?? 'include';

  async function request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const token = getToken?.() ?? null;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const init: RequestInit = {
      method,
      headers,
      credentials,
      signal,
    };

    if (body !== undefined) init.body = JSON.stringify(body);

    const response = await fetch(buildUrl(baseURL, path), init);

    if (!response.ok) {
      if (response.status === 401) onUnauthorized?.();
      throw new ApiError(response.status, await parseEnvelope(response));
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  return {
    get: <T>(path: string, signal?: AbortSignal) =>
      request<T>('GET', path, undefined, signal),
    post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
      request<T>('POST', path, body, signal),
    patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
      request<T>('PATCH', path, body, signal),
    delete: <T>(path: string, signal?: AbortSignal) =>
      request<T>('DELETE', path, undefined, signal),
  };
}