import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, refreshAccessToken } from "@/services/api";
import { useAuthStore } from "@/stores/auth";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const rateLimited = (retryAfterSeconds?: number) =>
  jsonResponse(
    429,
    { error: "RATE_LIMIT_EXCEEDED" },
    retryAfterSeconds === undefined ? {} : { "Retry-After": String(retryAfterSeconds) },
  );

const expiredRefresh = () => jsonResponse(401, { error: "REFRESH_TOKEN_EXPIRED" });
const renewedToken = () => jsonResponse(200, { accessToken: "novo-token" });

function startLoggedIn() {
  useAuthStore.setState({
    user: { id: "1", email: "a@b.c", fullName: "Ana Souza", role: "USER" } as never,
    token: "token-antigo",
    isAuthenticated: true,
  });
}

describe("renovação de sessão (refresh)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    startLoggedIn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("401 do refresh encerra a sessão", async () => {
    fetchMock.mockResolvedValueOnce(expiredRefresh());

    const result = await refreshAccessToken();

    expect(result.status).toBe("unauthenticated");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("429 espera o Retry-After, tenta de novo e renova sem deslogar", async () => {
    fetchMock.mockResolvedValueOnce(rateLimited(2)).mockResolvedValueOnce(renewedToken());

    const pending = refreshAccessToken();
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    expect((await pending).status).toBe("renewed");
    expect(useAuthStore.getState().token).toBe("novo-token");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("429 sem Retry-After legível espera 1 s (não 0) antes de tentar de novo", async () => {
    fetchMock.mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(renewedToken());

    const pending = refreshAccessToken();
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    expect((await pending).status).toBe("renewed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("limita a espera a 10 s mesmo com Retry-After maior", async () => {
    fetchMock.mockResolvedValueOnce(rateLimited(120)).mockResolvedValueOnce(renewedToken());

    const pending = refreshAccessToken();
    await vi.advanceTimersByTimeAsync(9999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    expect((await pending).status).toBe("renewed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("429 persistente NÃO limpa a sessão: devolve 'unavailable' recuperável", async () => {
    fetchMock.mockResolvedValueOnce(rateLimited(1)).mockResolvedValueOnce(rateLimited(1));

    const pending = refreshAccessToken();
    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;

    expect(result.status).toBe("unavailable");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.fullName).toBe("Ana Souza");
  });

  it("falha de rede também não derruba a sessão", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const result = await refreshAccessToken();

    expect(result.status).toBe("unavailable");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("chamadas simultâneas compartilham um único refresh", async () => {
    fetchMock.mockResolvedValueOnce(renewedToken());

    const [first, second] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);

    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("requisições com sessão a renovar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    startLoggedIn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("401 + refresh ok repete a requisição original", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: "UNAUTHORIZED" }))
      .mockResolvedValueOnce(renewedToken())
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await expect(api.get("/portfolio")).resolves.toEqual({ ok: true });
  });

  it("401 + refresh limitado (429) propaga o 429 e mantém o usuário logado", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: "UNAUTHORIZED" }))
      .mockResolvedValueOnce(rateLimited(1))
      .mockResolvedValueOnce(rateLimited(1));

    const outcome = api.get("/portfolio").catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1000);
    const error = await outcome;

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(429);
    expect((error as ApiError).retryAfterSeconds).toBe(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("429 sem corpo ganha mensagem amigável em pt-BR", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 }));

    await expect(api.get("/portfolio")).rejects.toThrow(/Muitas requisições/);
  });
});

describe("restaurar a sessão pelo cookie (store.refresh)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("depois de renovar, busca /users/me e repovoa o nome do usuário", async () => {
    fetchMock
      .mockResolvedValueOnce(renewedToken())
      .mockResolvedValueOnce(jsonResponse(200, { id: "1", fullName: "Ana Souza", role: "USER" }));

    const result = await useAuthStore.getState().refresh();

    expect(result.status).toBe("renewed");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/users/me");
    expect(useAuthStore.getState().user?.fullName).toBe("Ana Souza");
  });

  it("se /users/me falhar, a sessão renovada continua valendo", async () => {
    fetchMock
      .mockResolvedValueOnce(renewedToken())
      .mockResolvedValueOnce(jsonResponse(500, { error: "INTERNAL" }));

    const result = await useAuthStore.getState().refresh();

    expect(result.status).toBe("renewed");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
