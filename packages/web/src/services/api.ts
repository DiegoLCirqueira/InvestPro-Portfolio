import { useAuthStore } from "@/stores/auth";

export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
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
      body?.message || `Erro na requisição (${res.status})`,
      body?.error,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

let refreshingPromise: Promise<boolean> | null = null;

export function refreshAccessToken(): Promise<boolean> {
  if (!refreshingPromise) {
    // Usa rawFetch para renovar o token SEM tentar renovar novamente em caso de 401
    refreshingPromise = rawFetch<{ accessToken: string }>("/auth/refresh", {
      method: "POST",
    })
      .then(({ accessToken }) => {
        useAuthStore.setState({ token: accessToken, isAuthenticated: true });
        return true;
      })
      .catch(() => {
        useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
        return false;
      })
      .finally(() => {
        refreshingPromise = null;
      });
  }
  return refreshingPromise;
}

async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  try {
    return await rawFetch<T>(endpoint, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const ok = await refreshAccessToken();
      if (ok) {
        return rawFetch<T>(endpoint, options);
      }
    }
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
