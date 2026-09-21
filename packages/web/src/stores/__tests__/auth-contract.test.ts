import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});

const USER = { id: "u1", email: "ana@example.com", fullName: "Ana Souza", role: "USER" as const };

// (Este arquivo importa a store primeiro de propósito: store e api.ts se importam mutuamente.)
// Contrato com packages/server/src/modules/auth/auth.schema.ts: o servidor é a fonte da verdade
// dos nomes de campo; estes testes fixam o que o cliente realmente envia.
describe("payloads de autenticação enviados ao servidor", () => {
  beforeEach(() => {
    apiMock.get.mockReset().mockResolvedValue(USER);
    apiMock.post.mockReset().mockResolvedValue({ user: USER, accessToken: "token" });
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it("login envia { email, password }", async () => {
    await useAuthStore.getState().login({ email: "ana@example.com", password: "Senha#1234" });

    expect(apiMock.post).toHaveBeenCalledWith("/auth/login", { email: "ana@example.com", password: "Senha#1234" });
  });

  it("cadastro envia { email, password, fullName } (e não `name`)", async () => {
    await useAuthStore.getState().register({ email: "ana@example.com", password: "Senha#1234", fullName: "Ana Souza" });

    expect(apiMock.post).toHaveBeenCalledWith("/auth/register", {
      email: "ana@example.com",
      password: "Senha#1234",
      fullName: "Ana Souza",
    });
  });

  it("logout não envia corpo (o servidor usa só o cookie de refresh)", async () => {
    apiMock.post.mockResolvedValue({ message: "ok" });

    await useAuthStore.getState().logout();

    expect(apiMock.post).toHaveBeenCalledWith("/auth/logout");
  });
});
