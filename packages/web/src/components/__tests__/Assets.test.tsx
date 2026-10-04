import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Assets } from "@/components/Assets";

vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolioPositions: () => ({
    data: { balance: 1_250, totalEquity: 9_000 },
    positions: [
      {
        id: "p1",
        ticker: "PETR4",
        name: "Petrobras",
        type: "STOCK",
        quantity: 10,
        avgPrice: 30,
        currentValue: 300,
      },
    ],
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

describe("Assets (Seus Ativos)", () => {
  it("lista só os ativos: a Caixinha tem página própria", () => {
    render(
      <MemoryRouter>
        <Assets />
      </MemoryRouter>,
    );

    expect(screen.getByText("PETR4")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Caixinha" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Depositar" })).not.toBeInTheDocument();
  });

  it("o valor total do portfólio continua o do servidor (que soma a Caixinha)", () => {
    render(
      <MemoryRouter>
        <Assets />
      </MemoryRouter>,
    );

    expect(screen.getByText(/R\$\s?9\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/caixinha/)).toBeInTheDocument();
  });
});
