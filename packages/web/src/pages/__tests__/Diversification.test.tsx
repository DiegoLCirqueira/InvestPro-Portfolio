import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Diversification } from "@/pages/Diversification";
import type { PortfolioDiversificationItem } from "@/types/portfolio";

const portfolioMock = vi.hoisted(() => ({
  breakdown: [] as PortfolioDiversificationItem[],
}));

vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolio: () => ({
    diversification: {
      totalBalance: portfolioMock.breakdown.reduce(
        (sum, item) => sum + item.value,
        0,
      ),
      breakdown: portfolioMock.breakdown,
    },
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-currency-holdings", () => ({
  useCurrencyHoldings: () => ({
    holdings: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <Diversification />
    </MemoryRouter>,
  );
}

describe("Diversificação", () => {
  beforeEach(() => {
    portfolioMock.breakdown = [];
  });

  it("sem investimentos: mostra um único aviso, sem gráfico, cards ou Moedas", () => {
    renderPage();

    expect(
      screen.getByText("Sua carteira ainda está vazia"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Ver ativos disponíveis" }),
    ).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Ver ativos disponíveis" }),
    ).toHaveAttribute("href", "/market");
    expect(
      screen.queryByText("Distribuição do portfólio"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Moedas")).not.toBeInTheDocument();
  });

  it("com investimentos: mostra a distribuição e os cards, sem o aviso de carteira vazia", () => {
    portfolioMock.breakdown = [
      { type: "STOCK", label: "Ações", value: 500, percentage: 25 },
      { type: "CRYPTO", label: "Criptomoedas", value: 1500, percentage: 75 },
    ];

    renderPage();

    expect(screen.getByText("Distribuição do portfólio")).toBeInTheDocument();
    // Cada card diz a fatia da carteira (sem repetir o nome) e a ordem é do maior para o menor.
    const shares = screen
      .getAllByText(/% da carteira$/)
      .map((el) => el.textContent);
    expect(shares).toEqual(["75,0% da carteira", "25,0% da carteira"]);
    expect(screen.getByText("Moedas")).toBeInTheDocument();
    expect(
      screen.queryByText("Sua carteira ainda está vazia"),
    ).not.toBeInTheDocument();
  });
});
