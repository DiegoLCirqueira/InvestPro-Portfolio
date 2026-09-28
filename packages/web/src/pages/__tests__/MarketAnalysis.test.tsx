import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MarketAnalysis } from "@/pages/MarketAnalysis";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/services/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});

const asset = (ticker: string, priceSource?: "live" | "seed") => ({
  id: ticker,
  ticker,
  name: `${ticker} SA`,
  type: "STOCK",
  price: 10,
  change24h: 0.5,
  changePercent: 1.2,
  ...(priceSource ? { priceSource } : {}),
});

async function renderMarket(items: ReturnType<typeof asset>[]) {
  apiMock.get.mockResolvedValue({
    items,
    total: items.length,
    page: 1,
    limit: 100,
  });
  render(
    <MemoryRouter>
      <MarketAnalysis />
    </MemoryRouter>,
  );
  await screen.findByText("Composição e Performance");
}

const BANNER =
  "Alguns preços estão estimados: a fonte de cotações está indisponível no momento.";

describe("MarketAnalysis: preços estimados (priceSource)", () => {
  beforeEach(() => apiMock.get.mockReset());

  it("com algum ativo 'seed': faixa de aviso (role=status) e selo 'estimado' só nos ativos afetados", async () => {
    await renderMarket([
      asset("PETR4", "seed"),
      asset("VALE3", "live"),
      asset("ITUB4"),
    ]);

    expect(screen.getByRole("status")).toHaveTextContent(BANNER);
    // Com algum preço estimado, o selo "Tempo real" não aparece.
    expect(screen.queryByText("Tempo real")).not.toBeInTheDocument();
    const tags = screen.getAllByText("estimado");
    expect(tags.length).toBeGreaterThan(0);
    // O selo aparece junto do PETR4 (seed), nunca junto de VALE3/ITUB4 (ao vivo ou sem campo).
    const petrCards = screen
      .getAllByText("PETR4")
      .map((el) => el.closest("li, tr") as HTMLElement)
      .filter(Boolean);
    expect(petrCards.some((card) => within(card).queryByText("estimado"))).toBe(
      true,
    );
    for (const liveTicker of ["VALE3", "ITUB4"]) {
      const liveCards = screen
        .getAllByText(liveTicker)
        .map((el) => el.closest("li, tr") as HTMLElement)
        .filter(Boolean);
      expect(
        liveCards.some((card) => within(card).queryByText("estimado")),
      ).toBe(false);
    }
  });

  it("todos ao vivo (ou backend antigo, sem o campo): sem faixa e sem selo", async () => {
    await renderMarket([asset("PETR4", "live"), asset("VALE3")]);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("estimado")).not.toBeInTheDocument();
    expect(screen.getByText("Tempo real")).toBeInTheDocument();
  });
});

describe("MarketAnalysis: do ativo para a ordem", () => {
  beforeEach(() => apiMock.get.mockReset());

  it("cada ativo leva ao formulário de ordem já com ele escolhido", async () => {
    await renderMarket([asset("PETR4", "live")]);

    const links = screen.getAllByRole("link", {
      name: "Negociar PETR4 (PETR4 SA)",
    });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links)
      expect(link).toHaveAttribute("href", "/orders?ticker=PETR4");
  });

  it("os cards de destaque do topo também levam à ordem do ativo", async () => {
    await renderMarket([asset("PETR4", "live")]);

    const highlight = screen
      .getAllByRole("link", { name: "Negociar PETR4 (PETR4 SA)" })
      .find((link) => link.querySelector("h2"));
    expect(highlight).toHaveAttribute("href", "/orders?ticker=PETR4");
  });

  it("nome igual ao ticker não se repete no rótulo do link nem como subtítulo", async () => {
    await renderMarket([{ ...asset("PETR4", "live"), name: "PETR4" }]);

    const links = screen.getAllByRole("link", { name: "Negociar PETR4" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const row = (link.closest("li, tr") ?? link) as HTMLElement;
      expect(within(row).getAllByText("PETR4")).toHaveLength(1);
    }
  });

  it("tipo em texto ('Renda fixa') e selo de sentimento só quando não é neutro", async () => {
    await renderMarket([
      { ...asset("SELIC", "live"), type: "FIXED_INCOME", changePercent: 0.5 },
    ]);

    expect(screen.getAllByText("Renda fixa").length).toBeGreaterThan(0);
    expect(screen.queryByText("Neutro")).not.toBeInTheDocument();
  });

  it("variação zero não aparece como alta", async () => {
    await renderMarket([
      { ...asset("PETR4", "live"), changePercent: 0, change24h: 0 },
    ]);

    for (const el of screen.getAllByText("0,00%")) {
      expect(el.className).not.toMatch(/text-brand-primary/);
    }
  });
});
