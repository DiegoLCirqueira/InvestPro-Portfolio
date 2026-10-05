import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { HomeRoute } from "@/app/HomeRoute";
import { useAuthStore } from "@/stores/auth";
import { ApiError, type RefreshResult } from "@/services/api";
import type { User } from "@/types/user";

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

// Usuário guardado de uma sessão anterior (o persist do auth guarda só ele, não o token).
const STORED_USER: User = { id: "u1", email: "ana@example.com", fullName: "Ana", role: "USER" };

// Formas como a restauração falha com a API fora (o api.ts devolve "unavailable" para todas).
const UNAVAILABLE: Array<[string, Error]> = [
  ["rede", new TypeError("Failed to fetch")],
  ["404 (aplicação não encontrada)", new ApiError(404, "Application not found")],
  ["500", new ApiError(500, "Erro interno")],
  ["429", new ApiError(429, "Muitas requisições")],
];

describe("HomeRoute (o que aparece em /)", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it("visitante (sem sessão anterior): vê a página inicial na hora, sem esperar a API", () => {
    const { refresh } = stubRefresh({ status: "unauthenticated" });
    renderAt("/");

    // O refresh nem terminou: a página inicial não depende dele.
    expect(screen.getByText("Página inicial")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it.each(UNAVAILABLE)(
    "visitante com a API fora (%s): fica na página inicial, sem tela de erro",
    async (_cause, error) => {
      const { finish } = stubRefresh({ status: "unavailable", error });
      renderAt("/");

      finish();
      expect(await screen.findByText("Página inicial")).toBeInTheDocument();
      expect(screen.queryByText("Painel")).not.toBeInTheDocument();
      expect(screen.queryByText(/Não foi possível/)).not.toBeInTheDocument();
    },
  );

  it.each(UNAVAILABLE)(
    "com sessão anterior e a API fora (%s): página inicial como deslogado",
    async (_cause, error) => {
      useAuthStore.setState({ user: STORED_USER });
      const { finish } = stubRefresh({ status: "unavailable", error });
      renderAt("/");

      finish();
      expect(await screen.findByText("Página inicial")).toBeInTheDocument();
      expect(screen.queryByText("Painel")).not.toBeInTheDocument();
    },
  );

  it("com sessão anterior: espera o refresh (sem piscar a página inicial) e segue para o Painel", async () => {
    useAuthStore.setState({ user: STORED_USER });
    const { finish } = stubRefresh({ status: "renewed" });
    renderAt("/");

    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
    expect(screen.queryByText("Página inicial")).not.toBeInTheDocument();

    finish();
    expect(await screen.findByText("Painel")).toBeInTheDocument();
    expect(screen.queryByText("Página inicial")).not.toBeInTheDocument();
  });

  it("sem sinal de sessão, mas o cookie renova: troca a página inicial pelo Painel", async () => {
    const { finish } = stubRefresh({ status: "renewed" });
    renderAt("/");
    expect(screen.getByText("Página inicial")).toBeInTheDocument();

    finish();
    expect(await screen.findByText("Painel")).toBeInTheDocument();
  });

  it("logado: vê o Painel, sem renovar a sessão", () => {
    const { refresh } = stubRefresh({ status: "renewed" });
    useAuthStore.setState({ isAuthenticated: true });
    renderAt("/");

    expect(screen.getByText("Painel")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("fora de /, nunca mostra a página inicial", () => {
    stubRefresh({ status: "unauthenticated" });
    renderAt("/market");

    expect(screen.getByText("Mercado")).toBeInTheDocument();
  });
});
