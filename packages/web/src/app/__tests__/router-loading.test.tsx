import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Router } from "@/app/router";
import { useAuthStore } from "@/stores/auth";
import type { User } from "@/types/user";

// Requisições ficam pendentes: o teste olha só o primeiro quadro, com o código da página baixando.
vi.mock("@/services/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/api")>();
  const pending = () => new Promise<never>(() => {});
  return { ...original, api: { get: pending, post: pending, patch: pending, put: pending, delete: pending } };
});

const ADMIN: User = { id: "u1", email: "ana@example.com", fullName: "Ana", role: "ADMIN" };

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Router />
    </MemoryRouter>,
  );
}

describe("Router: carregamento das páginas (Suspense)", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: ADMIN, token: "t", isAuthenticated: true });
  });

  it.each([
    "/recommendations",
    "/diversification",
    "/profile",
    "/profile/investor-profile",
    "/admin/users",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/rota-que-nao-existe",
  ])("%s: enquanto o código baixa, mostra carregamento e nunca o texto de erro", (path) => {
    renderAt(path);

    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Carregando…");
    expect(screen.queryByText("Erro ao carregar esta página")).not.toBeInTheDocument();
    expect(screen.queryByText("Voltar ao início")).not.toBeInTheDocument();
  });
});
