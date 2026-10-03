import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Assets } from "@/components/Assets";
import type { PortfolioPosition } from "@/types/portfolio";

const mockPortfolio = vi.hoisted(() => ({ positions: [] as PortfolioPosition[] }));

vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolioPositions: () => ({
    data: { balance: 1_250, totalEquity: 9_000 },
    positions: mockPortfolio.positions,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-savings-box", () => ({
  useSavingsBox: () => ({ balance: 0, refetch: vi.fn() }),
  useSavingsBoxDeposit: () => ({ mutate: vi.fn(), isPending: false }),
  useSavingsBoxWithdraw: () => ({ mutate: vi.fn(), isPending: false }),
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
    mockPortfolio.positions = [];
  });

  it("a Caixinha vem fixa no topo, antes dos ativos", () => {
    mockPortfolio.positions = [
      {
        id: "p1",
        ticker: "PETR4",
        name: "Petrobras",
        type: "STOCK",
        quantity: 10,
        avgPrice: 30,
        currentValue: 300,
      },
    ];
    renderAssets();

    const savingsBox = screen.getByRole("region", { name: "Caixinha" });
    const firstAsset = screen.getByText("PETR4");
    // DOCUMENT_POSITION_FOLLOWING: o ativo vem depois da Caixinha.
    expect(savingsBox.compareDocumentPosition(firstAsset)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(savingsBox).not.toContainElement(firstAsset);
  });

  it("aparece mesmo sem ativos e com R$ 0,00 guardado", () => {
    renderAssets();

    const savingsBox = screen.getByRole("region", { name: "Caixinha" });
    expect(savingsBox).toHaveTextContent(/R\$\s?0,00/);
    expect(screen.getByText(/Você ainda não possui ativos/)).toBeInTheDocument();
  });
});
