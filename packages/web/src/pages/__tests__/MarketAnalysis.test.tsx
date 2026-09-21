import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MarketAnalysis } from "@/pages/MarketAnalysis";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});

const asset = (ticker: string, priceSource?: "live" | "seed") => ({
  id: ticker, ticker, name: `${ticker} SA`, type: "STOCK", price: 10, change24h: 0.5, changePercent: 1.2, ...(priceSource ? { priceSource } : {}),
});

async function renderMarket(items: ReturnType<typeof asset>[]) {
  apiMock.get.mockResolvedValue({ items, total: items.length, page: 1, limit: 100 });
  render(<MemoryRouter><MarketAnalysis /></MemoryRouter>);
  await screen.findByText("Composição e Performance");
}

const BANNER = "Alguns preços estão estimados: a fonte de cotações está indisponível no momento.";

describe("MarketAnalysis: preços estimados (priceSource)", () => {
  beforeEach(() => apiMock.get.mockReset());

  it("com algum ativo 'seed': faixa de aviso (role=status) e selo 'estimado' só nos ativos afetados", async () => {
    await renderMarket([asset("PETR4", "seed"), asset("VALE3", "live"), asset("ITUB4")]);

    expect(screen.getByRole("status")).toHaveTextContent(BANNER);
    const tags = screen.getAllByText("estimado");
    expect(tags.length).toBeGreaterThan(0);
    // O selo aparece junto do PETR4 (seed), nunca junto de VALE3/ITUB4 (ao vivo ou sem campo).
    const petrCards = screen.getAllByText("PETR4").map((el) => el.closest("div.p-4, tr") as HTMLElement).filter(Boolean);
    expect(petrCards.some((card) => within(card).queryByText("estimado"))).toBe(true);
    for (const liveTicker of ["VALE3", "ITUB4"]) {
      const liveCards = screen.getAllByText(liveTicker).map((el) => el.closest("div.p-4, tr") as HTMLElement).filter(Boolean);
      expect(liveCards.some((card) => within(card).queryByText("estimado"))).toBe(false);
    }
  });

  it("todos ao vivo (ou backend antigo, sem o campo): sem faixa e sem selo", async () => {
    await renderMarket([asset("PETR4", "live"), asset("VALE3")]);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("estimado")).not.toBeInTheDocument();
  });
});
