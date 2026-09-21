import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import { ForgotPassword } from "@/pages/ForgotPassword";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { ApiError } from "@/services/api";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
const authMock = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});
// A store e o api.ts se importam mutuamente; sem este mock a ordem dos imports decide qual api a store usa.
vi.mock("@/stores/auth", () => ({
  useAuthStore: (select: (state: typeof authMock) => unknown) => select(authMock),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const RAW_SERVER_TEXT = "Rate limit exceeded, retry in 47 seconds";
const FRIENDLY_MESSAGE = "Muitas tentativas. Tente novamente em 47 segundos.";

function renderPage(page: React.ReactElement) {
  render(<MemoryRouter>{page}</MemoryRouter>);
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe.each([
  ["RATE_LIMIT_EXCEEDED", "429 por IP"],
  ["ACCOUNT_RATE_LIMITED", "429 por conta"],
])("429 nas telas de autenticação (%s: %s)", (code) => {
  beforeEach(() => {
    const rateLimited = new ApiError(429, RAW_SERVER_TEXT, code, 47);
    apiMock.post.mockReset().mockRejectedValue(rateLimited);
    authMock.login.mockReset().mockRejectedValue(rateLimited);
    authMock.register.mockReset().mockRejectedValue(rateLimited);
    vi.mocked(toast.error).mockClear();
  });

  it("login: mostra a mensagem amigável (na tela e no toast) e nunca o texto do servidor", async () => {
    renderPage(<Login />);
    type("Email", "ana@example.com");
    type("Senha", "Senha#1234");

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText(FRIENDLY_MESSAGE)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(FRIENDLY_MESSAGE);
    expect(screen.queryByText(RAW_SERVER_TEXT)).not.toBeInTheDocument();
  });

  it("cadastro: mostra a mensagem amigável e nunca o texto do servidor", async () => {
    renderPage(<Register />);
    type("Nome Completo", "Ana Souza");
    type("Email", "ana@example.com");
    type("Senha", "Senha#1234");
    type("Confirmar Senha", "Senha#1234");

    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText(FRIENDLY_MESSAGE)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(FRIENDLY_MESSAGE);
    expect(screen.queryByText(RAW_SERVER_TEXT)).not.toBeInTheDocument();
  });

  it("esqueci a senha: o toast é amigável, sem o texto do servidor", async () => {
    renderPage(<ForgotPassword />);
    type("Email", "ana@example.com");

    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(FRIENDLY_MESSAGE));
    expect(toast.error).not.toHaveBeenCalledWith(RAW_SERVER_TEXT);
  });
});

describe("login: outros erros não são tratados como limite de tentativas", () => {
  it("credenciais inválidas continuam mostrando a mensagem do servidor", async () => {
    authMock.login.mockReset().mockRejectedValue(new ApiError(401, "Email ou senha inválidos", "INVALID_CREDENTIALS"));
    renderPage(<Login />);
    type("Email", "ana@example.com");
    type("Senha", "Senha#1234");

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Email ou senha inválidos")).toBeInTheDocument();
  });
});
