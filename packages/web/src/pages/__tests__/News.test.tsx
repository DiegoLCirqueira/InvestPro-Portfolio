import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { News } from "@/pages/News";

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});

const item = {
  id: "1",
  title: "Ibovespa sobe",
  summary: "Bolsa fecha em alta.",
  source: "InfoMoney",
  category: "MARKET",
  url: "https://example.com/1",
  publishedAt: "2026-09-27T12:00:00.000Z",
};

function renderNews() {
  return render(
    <MemoryRouter>
      <News />
    </MemoryRouter>,
  );
}

describe("Notícias: filtros de categoria", () => {
  beforeEach(() => apiMock.get.mockReset());

  it("mostra só as categorias que têm notícia (mais 'Todas')", async () => {
    apiMock.get.mockResolvedValue({
      items: [item],
      total: 1,
      page: 1,
      limit: 20,
      categories: ["MARKET", "CRYPTO"],
    });

    renderNews();

    expect(
      await screen.findByRole("button", { name: "Mercado" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cripto" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Economia" }),
    ).not.toBeInTheDocument();
  });

  it("sem a lista de categorias (API antiga), mantém todos os filtros", async () => {
    apiMock.get.mockResolvedValue({
      items: [item],
      total: 1,
      page: 1,
      limit: 20,
    });

    renderNews();

    expect(
      await screen.findByRole("button", { name: "Economia" }),
    ).toBeInTheDocument();
  });
});
