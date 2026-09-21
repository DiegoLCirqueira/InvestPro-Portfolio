import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, refreshAccessToken } from "@/services/api";
import { useAuthStore } from "@/stores/auth";

const fetchMock = vi.fn();

const jsonResponse = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// JWT só com o exp (o cliente não valida assinatura).
function jwtExpiringIn(seconds: number): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds }));
  return `header.${payload.replace(/=+$/, "")}.assinatura`;
}

const refreshCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"));

function setSession(token: string | null) {
  useAuthStore.setState({ token, isAuthenticated: token !== null, user: null });
}

// Servidor de mentira: só o token "novo" é aceito; /auth/refresh entrega "novo".
function fakeServer() {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith("/auth/refresh")) return jsonResponse(200, { accessToken: "novo" });
    const authorization = (init?.headers as Record<string, string> | undefined)?.Authorization;
    return authorization === "Bearer novo" ? jsonResponse(200, { ok: true }) : jsonResponse(401, { error: "UNAUTHORIZED" });
  });
}

describe("renovação em single-flight", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    setSession("velho");
  });

  afterEach(() => vi.unstubAllGlobals());

  it("várias chamadas simultâneas de refresh = UMA requisição", async () => {
    fakeServer();

    const results = await Promise.all(Array.from({ length: 8 }, () => refreshAccessToken({ force: true })));

    expect(refreshCalls()).toHaveLength(1);
    expect(results.every((result) => result.status === "renewed")).toBe(true);
  });

  it("vários 401 simultâneos disparam um único refresh e todos repetem com o token novo", async () => {
    fakeServer();

    const responses = await Promise.all([api.get("/a"), api.get("/b"), api.get("/c")]);

    expect(refreshCalls()).toHaveLength(1);
    expect(responses).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
  });

  it("um 401 que chega DEPOIS de outra requisição já ter renovado só repete: sem novo refresh", async () => {
    let answerLateRequest: (response: Response) => void = () => {};
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const authorization = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (String(url).endsWith("/auth/refresh")) return jsonResponse(200, { accessToken: "novo" });
      if (authorization === "Bearer novo") return jsonResponse(200, { ok: true });
      if (String(url).endsWith("/late")) return new Promise<Response>((resolve) => (answerLateRequest = resolve));
      return jsonResponse(401, { error: "UNAUTHORIZED" });
    });

    const late = api.get("/late");
    await api.get("/quick"); // 401 -> refresh -> repete
    answerLateRequest(jsonResponse(401, { error: "UNAUTHORIZED" }));

    await expect(late).resolves.toEqual({ ok: true });
    expect(refreshCalls()).toHaveLength(1);
  });

  it("403 (ex.: senha atual incorreta) NÃO é 401: não renova e não derruba a sessão", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { error: "INVALID_CURRENT_PASSWORD", message: "Senha atual incorreta" }));

    await expect(api.patch("/users/me", { cpf: "x", currentPassword: "errada" })).rejects.toMatchObject({
      status: 403,
      code: "INVALID_CURRENT_PASSWORD",
    });

    expect(refreshCalls()).toHaveLength(0);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe("velho");
  });

  it("access token ainda válido em memória dispensa a requisição (sem force)", async () => {
    setSession(jwtExpiringIn(600));

    const result = await refreshAccessToken();

    expect(result.status).toBe("renewed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("token vencido (ou quase) ou ilegível NÃO dispensa; e 'force' sempre renova", async () => {
    fakeServer();

    setSession(jwtExpiringIn(-5));
    await refreshAccessToken();
    setSession(jwtExpiringIn(10)); // dentro da margem de 30 s
    await refreshAccessToken();
    setSession("nao-e-jwt");
    await refreshAccessToken();
    setSession(jwtExpiringIn(600));
    await refreshAccessToken({ force: true });

    expect(refreshCalls()).toHaveLength(4);
  });

  it("a requisição de refresh usa keepalive, cookie e NENHUM Authorization (fica 'simples', sem preflight)", async () => {
    fakeServer();
    setSession(jwtExpiringIn(-5));

    await refreshAccessToken();

    const [, init] = refreshCalls()[0] as [string, RequestInit];
    expect(init.keepalive).toBe(true);
    expect(init.credentials).toBe("include");
    expect(init.method).toBe("POST");
    expect(init.headers).toBeUndefined();
  });
});

describe("renovação e Web Locks (entre abas)", () => {
  const originalLocks = Object.getOwnPropertyDescriptor(navigator, "locks");

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    setSession(null);
    fakeServer();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalLocks) Object.defineProperty(navigator, "locks", originalLocks);
    else delete (navigator as { locks?: unknown }).locks;
  });

  const installLocks = (request: (name: string, task: () => Promise<unknown>) => Promise<unknown>) =>
    Object.defineProperty(navigator, "locks", { value: { request }, configurable: true });

  it("a requisição de refresh roda DENTRO do lock 'investpro:refresh-session'", async () => {
    const events: string[] = [];
    installLocks(async (name, task) => {
      events.push(`lock:${name}`);
      const result = await task();
      events.push("unlock");
      return result;
    });
    fetchMock.mockImplementation(async (url: string) => {
      events.push(`fetch:${String(url).split("/").pop()}`);
      return jsonResponse(200, { accessToken: "novo" });
    });

    await refreshAccessToken();

    expect(events).toEqual(["lock:investpro:refresh-session", "fetch:refresh", "unlock"]);
  });

  it("sem a API de locks, renova normalmente", async () => {
    delete (navigator as { locks?: unknown }).locks;

    const result = await refreshAccessToken();

    expect(result.status).toBe("renewed");
    expect(refreshCalls()).toHaveLength(1);
  });

  it("lock recusado por SecurityError não impede a renovação", async () => {
    installLocks(async () => {
      throw new DOMException("sem acesso", "SecurityError");
    });

    const result = await refreshAccessToken();

    expect(result.status).toBe("renewed");
  });

  it("a espera do 429 acontece FORA do lock (não trava as outras abas)", async () => {
    vi.useFakeTimers();
    let holdingLock = false;
    const holdingDuringSleep: boolean[] = [];
    installLocks(async (_name, task) => {
      holdingLock = true;
      try {
        return await task();
      } finally {
        holdingLock = false;
      }
    });
    fetchMock
      .mockImplementationOnce(async () => new Response(JSON.stringify({ error: "RATE_LIMIT_EXCEEDED" }), { status: 429, headers: { "Retry-After": "2" } }))
      .mockImplementationOnce(async () => jsonResponse(200, { accessToken: "novo" }));

    const pending = refreshAccessToken();
    await vi.advanceTimersByTimeAsync(1000);
    holdingDuringSleep.push(holdingLock);
    await vi.advanceTimersByTimeAsync(1000);

    expect((await pending).status).toBe("renewed");
    expect(holdingDuringSleep).toEqual([false]);
    vi.useRealTimers();
  });
});
