import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { useAuthStore } from "@/stores/auth";
import { ApiError, type RefreshResult } from "@/services/api";
import type { User } from "@/types/user";

// Tela de login que mostra para onde voltar depois de entrar (state.from do Navigate).
function LoginProbe() {
  const from = (useLocation().state as { from?: { pathname: string } } | null)?.from;
  return <p>Tela de login (volta para {from?.pathname ?? "?"})</p>;
}

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/privado"]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route
          path="/privado"
          element={
            <ProtectedRoute>
              <p>Conteúdo privado</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

function stubRefresh(...results: RefreshResult[]) {
  const refresh = vi.fn();
  for (const result of results) {
    refresh.mockImplementationOnce(async () => {
      if (result.status === "renewed") useAuthStore.setState({ isAuthenticated: true });
      return result;
    });
  }
  useAuthStore.setState({ refresh });
  return refresh;
}

// Usuário guardado de uma sessão anterior (o persist do auth guarda só ele, não o token).
const STORED_USER: User = { id: "u1", email: "ana@example.com", fullName: "Ana", role: "USER" };

describe("ProtectedRoute", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it("já autenticado: mostra o conteúdo sem renovar", () => {
    const refresh = stubRefresh();
    useAuthStore.setState({ isAuthenticated: true });

    renderProtected();

    expect(screen.getByText("Conteúdo privado")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("401 no refresh (sessão acabou): manda para o login, com volta para a rota", async () => {
    stubRefresh({ status: "unauthenticated" });

    renderProtected();

    expect(await screen.findByText("Tela de login (volta para /privado)")).toBeInTheDocument();
  });

  it.each([
    ["rede", new TypeError("Failed to fetch")],
    ["404", new ApiError(404, "Application not found")],
    ["500", new ApiError(500, "Erro interno")],
  ])("sem sessão anterior e a API fora (%s): vai para o login, não para uma tela de erro", async (_cause, error) => {
    stubRefresh({ status: "unavailable", error });

    renderProtected();

    expect(await screen.findByText("Tela de login (volta para /privado)")).toBeInTheDocument();
    expect(screen.queryByText("Não foi possível restaurar sua sessão")).not.toBeInTheDocument();
  });

  it("com sessão anterior e falha recuperável: NÃO vai para o login e oferece tentar de novo", async () => {
    useAuthStore.setState({ user: STORED_USER });
    const refresh = stubRefresh(
      { status: "unavailable", error: new ApiError(429, "Muitas requisições") },
      { status: "renewed" },
    );

    renderProtected();

    expect(await screen.findByText("Não foi possível restaurar sua sessão")).toBeInTheDocument();
    expect(screen.queryByText(/Tela de login/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await waitFor(() => expect(screen.getByText("Conteúdo privado")).toBeInTheDocument());
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  describe("mensagem conforme a causa (com sessão anterior)", () => {
    beforeEach(() => {
      useAuthStore.setState({ user: STORED_USER });
    });

    it("429: muitas requisições", async () => {
      stubRefresh({ status: "unavailable", error: new ApiError(429, "Muitas requisições") });

      renderProtected();

      expect(
        await screen.findByText(/O servidor está recebendo muitas requisições no momento/),
      ).toBeInTheDocument();
    });

    it.each([
      ["rede", new TypeError("Failed to fetch")],
      ["404", new ApiError(404, "Application not found")],
      ["500", new ApiError(500, "Erro interno")],
    ])("%s: não conectou ao servidor, com Tentar novamente", async (_cause, error) => {
      stubRefresh({ status: "unavailable", error });

      renderProtected();

      expect(
        await screen.findByText("Não foi possível conectar ao servidor. Tente novamente em instantes."),
      ).toBeInTheDocument();
      expect(screen.queryByText(/muitas requisições/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    });

    it("401: vai para o login", async () => {
      stubRefresh({ status: "unauthenticated" });

      renderProtected();

      expect(await screen.findByText("Tela de login (volta para /privado)")).toBeInTheDocument();
    });
  });
});
