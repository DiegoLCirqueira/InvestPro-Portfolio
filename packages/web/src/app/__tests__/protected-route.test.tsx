import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { useAuthStore } from "@/stores/auth";
import type { RefreshResult } from "@/services/api";

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/privado"]}>
      <Routes>
        <Route path="/login" element={<p>Tela de login</p>} />
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

  it("401 no refresh (sessão acabou): manda para o login", async () => {
    stubRefresh({ status: "unauthenticated" });

    renderProtected();

    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
  });

  it("falha recuperável (429): NÃO vai para o login e oferece tentar de novo", async () => {
    const refresh = stubRefresh(
      { status: "unavailable", error: new Error("Muitas requisições") },
      { status: "renewed" },
    );

    renderProtected();

    expect(await screen.findByText("Não foi possível restaurar sua sessão")).toBeInTheDocument();
    expect(screen.queryByText("Tela de login")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await waitFor(() => expect(screen.getByText("Conteúdo privado")).toBeInTheDocument());
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
