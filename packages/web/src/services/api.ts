import { isAccessTokenFresh } from "@/lib/jwt";
import { runExclusiveAcrossTabs } from "@/services/cross-tab-lock";
import { useAuthStore } from "@/stores/auth";

export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1";

// Teto da espera por um 429: mais que isso o usuário desiste, e a tela
// oferece "tentar novamente" em vez de deixar o app parado.
const MAX_RETRY_AFTER_MS = 10_000;
const DEFAULT_RETRY_AFTER_MS = 1_000;
const REFRESH_LOCK_NAME = "investpro:refresh-session";

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

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as
    | { error?: string; message?: string }
    | null;
  return new ApiError(
    res.status,
    body?.message || fallbackMessage(res.status),
    body?.error,
    res.status === 429 ? parseRetryAfterSeconds(res) : undefined,
  );
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

  if (!res.ok) throw await toApiError(res);

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

// Renovar a sessão só usa o cookie httpOnly de refresh: sem Authorization e sem corpo, é uma
// requisição "simples" (sem preflight). Isso permite o `keepalive`, que deixa a requisição
// terminar mesmo se a página for recarregada/fechada no meio. Sem ele, um reload que aborta a
// resposta depois de o servidor já ter rotacionado o token deixa o navegador com o cookie
// antigo, e a próxima renovação parece um reuso de token (sessão derrubada).
async function postRefresh(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
  });
  if (!res.ok) throw await toApiError(res);
  return ((await res.json()) as { accessToken: string }).accessToken;
}

const postRefreshExclusive = () => runExclusiveAcrossTabs(REFRESH_LOCK_NAME, postRefresh);

// Um 429 é limite de requisições, não sessão perdida: espera o Retry-After
// (com teto, e FORA do lock, para não travar as outras abas) e tenta uma segunda vez.
async function requestNewAccessToken(): Promise<string> {
  try {
    return await postRefreshExclusive();
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) throw error;
    await sleep(retryDelayMs(error));
    return postRefreshExclusive();
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

/**
 * Renova a sessão em "single-flight": quantas chamadas simultâneas houver nesta aba (bootstrap,
 * StrictMode, retries de 401), há UMA requisição em voo; entre abas, o lock serializa.
 * Sem `force`, um access token ainda válido em memória dispensa a requisição; o retry de um 401
 * usa `force` porque o servidor acabou de recusar o token, seja qual for o `exp`.
 */
export function refreshAccessToken({ force = false }: { force?: boolean } = {}): Promise<RefreshResult> {
  if (!force && isAccessTokenFresh(useAuthStore.getState().token)) {
    return Promise.resolve({ status: "renewed" });
  }
  refreshingPromise ??= renewSession().finally(() => {
    refreshingPromise = null;
  });
  return refreshingPromise;
}

async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const tokenAtSend = useAuthStore.getState().token;
  try {
    return await rawFetch<T>(endpoint, options);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error;

    // Outra requisição já renovou o token enquanto esta estava em voo: só repete.
    const currentToken = useAuthStore.getState().token;
    if (currentToken && currentToken !== tokenAtSend) return rawFetch<T>(endpoint, options);

    const refresh = await refreshAccessToken({ force: true });
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
  put: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};
