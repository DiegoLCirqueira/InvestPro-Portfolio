import { useAuthStore } from "@/stores/auth";

export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1";

// Teto da espera por um 429: mais que isso o usuário desiste, e a tela
// oferece "tentar novamente" em vez de deixar o app parado.
const MAX_RETRY_AFTER_MS = 10_000;
const DEFAULT_RETRY_AFTER_MS = 1_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    message: string,
    code?: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type QueryParams = Record<string, string | number | boolean | undefined>;

function buildQuery(query?: QueryParams): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

function fallbackMessage(status: number): string {
  return status === 429
    ? "Muitas requisições. Aguarde alguns segundos e tente novamente."
    : `Erro na requisição (${status})`;
}

// Cross-origin, o navegador só expõe este header se o servidor o listar em
// Access-Control-Expose-Headers; sem ele vale a espera padrão.
function parseRetryAfterSeconds(res: Response): number | undefined {
  const header = res.headers.get("Retry-After");
  if (header === null) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

async function rawFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token ?? "";
  const headers: Record<string, string> = {
    ...(options?.body ? { "Content-Type": "application/json" } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    throw new ApiError(
      res.status,
      body?.message || fallbackMessage(res.status),
      body?.error,
      res.status === 429 ? parseRetryAfterSeconds(res) : undefined,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

function retryDelayMs(error: ApiError): number {
  const requestedMs =
    error.retryAfterSeconds === undefined
      ? DEFAULT_RETRY_AFTER_MS
      : error.retryAfterSeconds * 1000;
  return Math.min(requestedMs, MAX_RETRY_AFTER_MS);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Usa rawFetch para renovar o token SEM tentar renovar novamente em caso de 401.
const postRefresh = () =>
  rawFetch<{ accessToken: string }>("/auth/refresh", { method: "POST" });

// Um 429 é limite de requisições, não sessão perdida: espera o Retry-After
// (com teto) e tenta uma segunda vez.
async function requestNewAccessToken(): Promise<string> {
  try {
    return (await postRefresh()).accessToken;
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) throw error;
    await sleep(retryDelayMs(error));
    return (await postRefresh()).accessToken;
  }
}

/**
 * - renewed: token novo em memória.
 * - unauthenticated: o servidor disse 401 — a sessão acabou de verdade.
 * - unavailable: falha recuperável (429 persistente, rede, 5xx). A sessão NÃO
 *   é limpa; quem chamou decide como avisar e permitir nova tentativa.
 */
export type RefreshResult =
  | { status: "renewed" }
  | { status: "unauthenticated" }
  | { status: "unavailable"; error: Error };

let refreshingPromise: Promise<RefreshResult> | null = null;

async function renewSession(): Promise<RefreshResult> {
  try {
    const accessToken = await requestNewAccessToken();
    useAuthStore.setState({ token: accessToken, isAuthenticated: true });
    return { status: "renewed" };
  } catch (error) {
    // Erros de sessão do backend são sempre 401 (refresh ausente, inválido,
    // expirado ou reutilizado). Só eles encerram a sessão.
    if (error instanceof ApiError && error.status === 401) {
      useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
      return { status: "unauthenticated" };
    }
    return {
      status: "unavailable",
      error: error instanceof Error ? error : new Error("Falha ao renovar a sessão"),
    };
  }
}

export function refreshAccessToken(): Promise<RefreshResult> {
  refreshingPromise ??= renewSession().finally(() => {
    refreshingPromise = null;
  });
  return refreshingPromise;
}

async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  try {
    return await rawFetch<T>(endpoint, options);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error;

    const refresh = await refreshAccessToken();
    if (refresh.status === "renewed") return rawFetch<T>(endpoint, options);
    // Sessão indisponível (não perdida): devolve a causa real, não o 401.
    if (refresh.status === "unavailable") throw refresh.error;
    throw error;
  }
}

export const api = {
  get: <T>(endpoint: string, query?: QueryParams) =>
    request<T>(`${endpoint}${buildQuery(query)}`, { method: "GET" }),
  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};
