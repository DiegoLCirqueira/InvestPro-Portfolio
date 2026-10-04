import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { InsufficientBalanceDialog } from "@/components/InsufficientBalanceDialog";
import type { BalanceShortfall } from "@/lib/balance-shortfall";
import { useInsufficientBalanceStore } from "@/stores/insufficient-balance";

vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolioPositions: () => ({ balance: 400, isLoading: false, refetch: vi.fn() }),
  useTopUpLimit: () => ({
    data: { limit: 3_000_000, used: 0, remaining: 3_000_000 },
    refetch: vi.fn(),
  }),
  useTopUpPortfolio: () => ({ mutate: vi.fn(), isPending: false }),
}));

const ORDER_SHORTFALL: BalanceShortfall = {
  kind: "order",
  cost: 1_010,
  available: 400,
  ticker: "PETR4",
};

afterEach(() => {
  act(() =>
    useInsufficientBalanceStore.setState({ isOpen: false, code: null, shortfall: null }),
  );
});

function openWith(code?: string, shortfall?: BalanceShortfall) {
  render(
    <MemoryRouter>
      <InsufficientBalanceDialog />
    </MemoryRouter>,
  );
  act(() => useInsufficientBalanceStore.getState().open(code, shortfall));
}

describe("Diálogo de saldo insuficiente", () => {
  it("sem código específico, fala do saldo em conta", () => {
    openWith("ORDER_INSUFFICIENT_BALANCE");

    expect(screen.getByText(/saldo em conta negativo/)).toBeInTheDocument();
  });

  it("no resgate da Caixinha, fala do valor guardado nela", () => {
    openWith("SAVINGS_BOX_INSUFFICIENT_BALANCE");

    expect(screen.getByText(/guardado na Caixinha/)).toBeInTheDocument();
    expect(
      screen.queryByText(/saldo em conta negativo/),
    ).not.toBeInTheDocument();
  });

  it("no câmbio sem saldo na moeda, fala da moeda de origem", () => {
    openWith("CURRENCY_HOLDING_INSUFFICIENT_BALANCE");

    expect(screen.getByText(/na moeda de origem/)).toBeInTheDocument();
  });

  it("fecha pelo botão Entendi", async () => {
    openWith();

    fireEvent.click(screen.getByRole("button", { name: "Entendi" }));

    await waitFor(() =>
      expect(useInsufficientBalanceStore.getState().isOpen).toBe(false),
    );
  });

  it("com o custo conhecido, diz quanto falta e troca o Entendi por adicionar saldo", () => {
    openWith("ORDER_INSUFFICIENT_BALANCE", ORDER_SHORTFALL);

    expect(screen.getByText(/Esta ordem custa R\$\s?1\.010,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?610,00/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustar a ordem" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entendi" })).not.toBeInTheDocument();
  });

  it("'Adicionar saldo grátis' abre o depósito já com o valor que falta", async () => {
    openWith("ORDER_INSUFFICIENT_BALANCE", ORDER_SHORTFALL);

    fireEvent.click(screen.getByRole("button", { name: "Adicionar saldo grátis" }));

    const field = (await screen.findByLabelText("Valor a adicionar")) as HTMLInputElement;
    expect(field.value).toMatch(/610,00/);
    expect(screen.getByText("Valor que falta para a sua ordem de PETR4.")).toBeInTheDocument();
    expect(useInsufficientBalanceStore.getState().isOpen).toBe(false);
  });
});
