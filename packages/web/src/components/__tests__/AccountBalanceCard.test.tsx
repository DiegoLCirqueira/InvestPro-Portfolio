import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AccountBalanceCard } from "@/components/AccountBalanceCard";

vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolioPositions: () => ({
    balance: 2261.26,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useTopUpLimit: () => ({
    data: { limit: 3_000_000, used: 0, remaining: 3_000_000 },
    refetch: vi.fn(),
  }),
  useTopUpPortfolio: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("AccountBalanceCard", () => {
  it("destaca o saldo em conta (dinheiro livre), não o patrimônio total", () => {
    render(<AccountBalanceCard availableBalance={2261.26} />);
    expect(screen.getByText("Saldo em conta")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /R\$\s?2\.261,26/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Valor total/)).not.toBeInTheDocument();
  });

  it("deixa claro que adicionar saldo é grátis e abre o formulário ali mesmo", () => {
    render(<AccountBalanceCard availableBalance={2261.26} />);
    expect(screen.getByText(/Adicionar saldo é grátis/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Adicionar saldo" }));

    expect(
      screen.getByRole("dialog", { name: "Adicionar saldo grátis" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Valor a adicionar")).toHaveFocus();
  });
});
