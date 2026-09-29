import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { HomeRoute } from "@/app/HomeRoute";
import { useAuthStore } from "@/stores/auth";
import type { RefreshResult } from "@/services/api";

// Mesma forma do router.tsx: HomeRoute envolve a rota do app inteira, com o Painel em "/".
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          element={
            <HomeRoute visitor={<p>Página inicial</p>}>
              <Outlet />
            </HomeRoute>
          }
        >
          <Route path="/" element={<p>Painel</p>} />
          <Route path="/market" element={<p>Mercado</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function stubRefresh(result: RefreshResult) {
  let finish: () => void = () => {};
  const refresh = vi.fn(
    () =>
      new Promise<RefreshResult>((resolve) => {
        finish = () => {
          if (result.status === "renewed") useAuthStore.setState({ isAuthenticated: true });
          resolve(result);
        };
      }),
  );
  useAuthStore.setState({ refresh });
  return { refresh, finish: () => finish() };
}

describe("HomeRoute (o que aparece em /)", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it("visitante (sem sessão): vê a página inicial", async () => {
    const { finish } = stubRefresh({ status: "unauthenticated" });
    renderAt("/");

    finish();
    expect(await screen.findByText("Página inicial")).toBeInTheDocument();
    expect(screen.queryByText("Painel")).not.toBeInTheDocument();
  });

  it("logado: vê o Painel, sem renovar a sessão", () => {
    const { refresh } = stubRefresh({ status: "renewed" });
    useAuthStore.setState({ isAuthenticated: true });
    renderAt("/");

    expect(screen.getByText("Painel")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("enquanto restaura a sessão: carregamento neutro, sem piscar a página inicial", async () => {
    const { finish } = stubRefresh({ status: "renewed" });
    renderAt("/");

    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
    expect(screen.queryByText("Página inicial")).not.toBeInTheDocument();

    finish();
    expect(await screen.findByText("Painel")).toBeInTheDocument();
    expect(screen.queryByText("Página inicial")).not.toBeInTheDocument();
  });

  it("sessão não confirmada agora (429): segue para o app, não trata como visitante", async () => {
    const { finish } = stubRefresh({ status: "unavailable", error: new Error("Muitas requisições") });
    renderAt("/");

    finish();
    expect(await screen.findByText("Painel")).toBeInTheDocument();
    expect(screen.queryByText("Página inicial")).not.toBeInTheDocument();
  });

  it("fora de /, nunca mostra a página inicial", () => {
    stubRefresh({ status: "unauthenticated" });
    renderAt("/market");

    expect(screen.getByText("Mercado")).toBeInTheDocument();
  });
});
