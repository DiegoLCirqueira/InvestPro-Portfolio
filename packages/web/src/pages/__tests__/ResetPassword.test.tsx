import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { toast } from "sonner";
import { ResetPassword } from "@/pages/ResetPassword";
import { ApiError } from "@/services/api";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const NEW_PASSWORD = "NovaSenha#2026";

function renderResetPassword(url = "/reset-password?token=abc") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>,
  );
}

function submitNewPassword() {
  fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: NEW_PASSWORD } });
  fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: NEW_PASSWORD } });
  fireEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));
}

describe("ResetPassword", () => {
  beforeEach(() => {
    apiMock.post.mockReset().mockResolvedValue({ message: "Senha redefinida com sucesso" });
    vi.mocked(toast.error).mockClear();
  });

  it("envia { token, newPassword } — o nome que o servidor exige — e não envia `password`", async () => {
    renderResetPassword();

    submitNewPassword();

    await screen.findByText("Sua senha foi redefinida com sucesso.");
    expect(apiMock.post).toHaveBeenCalledTimes(1);
    const [endpoint, body] = apiMock.post.mock.calls[0];
    expect(endpoint).toBe("/auth/reset-password");
    expect(body).toStrictEqual({ token: "abc", newPassword: NEW_PASSWORD });
    expect(body).not.toHaveProperty("password");
  });

  it("sucesso mostra a tela de confirmação com o caminho para o login", async () => {
    renderResetPassword();

    submitNewPassword();

    expect(await screen.findByRole("link", { name: "Ir para o login" })).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
  });

  it.each([
    [400, "INVALID_RESET_TOKEN"],
    [400, "VALIDATION_ERROR"],
    [401, "INVALID_RESET_TOKEN"],
  ])("%i %s mostra a mensagem única de link inválido, sem vazar o texto do servidor", async (status, code) => {
    apiMock.post.mockRejectedValue(new ApiError(status, "Token inválido ou expirado; [{\"path\":[\"newPassword\"]}]", code));
    renderResetPassword();

    submitNewPassword();

    expect(await screen.findByText(/O link pode ser inválido, ter expirado ou já ter sido usado/)).toBeInTheDocument();
    expect(screen.queryByText(/newPassword/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Solicitar novo link" })).toHaveAttribute("href", "/forgot-password");
  });

  it("sem token na URL mostra o link inválido sem chamar o servidor", () => {
    renderResetPassword("/reset-password");

    expect(screen.getByText(/O link pode ser inválido/)).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("429 avisa em pt-BR quanto esperar e mantém o formulário (o link ainda pode ser bom)", async () => {
    apiMock.post.mockRejectedValue(new ApiError(429, "Rate limit exceeded, retry in 47 seconds", "RATE_LIMIT_EXCEEDED", 47));
    renderResetPassword();

    submitNewPassword();

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Muitas tentativas. Tente novamente em 47 segundos."));
    expect(screen.getByLabelText("Nova senha")).toBeInTheDocument();
    expect(screen.queryByText(/O link pode ser inválido/)).not.toBeInTheDocument();
  });

  it("falha de rede ou 5xx também mantém o formulário, sem culpar o link", async () => {
    apiMock.post.mockRejectedValue(new ApiError(503, "upstream"));
    renderResetPassword();

    submitNewPassword();

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Tente novamente/)));
    expect(screen.getByLabelText("Nova senha")).toBeInTheDocument();
  });
});
