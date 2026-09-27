import { afterEach, describe, expect, it } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { InsufficientBalanceDialog } from "@/components/InsufficientBalanceDialog";
import { useInsufficientBalanceStore } from "@/stores/insufficient-balance";

afterEach(() => {
  act(() =>
    useInsufficientBalanceStore.setState({ isOpen: false, code: null }),
  );
});

function openWith(code?: string) {
  render(<InsufficientBalanceDialog />);
  act(() => useInsufficientBalanceStore.getState().open(code));
}

describe("Diálogo de saldo insuficiente", () => {
  it("sem código específico, fala do saldo em conta", () => {
    openWith("ORDER_INSUFFICIENT_BALANCE");

    expect(screen.getByText(/saldo em conta negativo/)).toBeInTheDocument();
  });

  it("no resgate da caixinha, fala do valor guardado nela", () => {
    openWith("SAVINGS_BOX_INSUFFICIENT_BALANCE");

    expect(screen.getByText(/guardado nesta caixinha/)).toBeInTheDocument();
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
});
