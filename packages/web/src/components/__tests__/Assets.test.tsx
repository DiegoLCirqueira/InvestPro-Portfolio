import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Assets } from "@/components/Assets";

const mocks = vi.hoisted(() => ({
  savingsBox: { data: { balance: 1_000 } as { balance: number } | undefined, balance: 1_000 },
}));

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

vi.mock("@/hooks/use-savings-box", () => ({
  useSavingsBox: () => mocks.savingsBox,
}));

function renderAssets() {
  render(
    <MemoryRouter>
      <Assets />
    </MemoryRouter>,
  );
}

describe("Assets (Seus Ativos)", () => {
  beforeEach(() => {
    mocks.savingsBox = { data: { balance: 1_000 }, balance: 1_000 };
  });

  it("lista só os ativos: a Caixinha tem página própria", () => {
    renderAssets();

    expect(screen.getByText("PETR4")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Caixinha" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Depositar" })).not.toBeInTheDocument();
  });

  it("o total do servidor vem detalhado em partes que somam exatamente ele", () => {
    renderAssets();

    expect(screen.getByText(/R\$\s?9\.000,00/)).toBeInTheDocument();
    // 1.250 em conta + 300 em ativos + 1.000 na Caixinha + 6.450 em moedas = 9.000.
    const values = screen.getAllByRole("definition").map((dd) => dd.textContent ?? "");
    expect(values).toHaveLength(4);
    expect(values[0]).toMatch(/R\$\s?1\.250,00/);
    expect(values[1]).toMatch(/R\$\s?300,00/);
    expect(values[2]).toMatch(/R\$\s?1\.000,00/);
    expect(values[3]).toMatch(/R\$\s?6\.450,00/);
  });

  it("sem o saldo da Caixinha ainda, fica a frase do que o total inclui", () => {
    mocks.savingsBox = { data: undefined, balance: 0 };
    renderAssets();

    expect(screen.queryAllByRole("definition")).toHaveLength(0);
    expect(screen.getByText(/investimentos \+ Caixinha \+ moedas/)).toBeInTheDocument();
  });
});
