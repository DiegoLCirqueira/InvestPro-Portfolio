import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { OrderRow } from "@/components/orders/OrderRow";
import type { Order } from "@/types/order";

const filledOrder: Order = {
  id: "1",
  assetId: "a",
  ticker: "ITUB4",
  side: "BUY",
  type: "MARKET",
  quantity: 1000,
  price: 42.33,
  status: "FILLED",
  createdAt: "2026-09-19T15:19:02.000Z",
  executedAt: "2026-09-19T15:19:02.000Z",
  avgPrice: 42.33,
  fee: 0.42,
};

describe("OrderRow", () => {
  it("mostra preço, PM e taxa em reais no padrão pt-BR, sem ponto decimal", () => {
    const { container } = render(<OrderRow order={filledOrder} />);
    const text = container.textContent ?? "";

    expect(text).toMatch(/Preço: R\$\s42,33/);
    expect(text).toMatch(/PM: R\$\s42,33/);
    expect(text).toMatch(/Taxa: R\$\s0,42/);
    expect(text).toContain("Qtd: 1.000");
    expect(text).not.toContain("42.33");
  });

  it("o ticker tem a mesma largura mínima em toda linha, curto ou longo", () => {
    for (const ticker of ["BTC", "ITUB4", "USDBRL"]) {
      const { getByText, unmount } = render(<OrderRow order={{ ...filledOrder, ticker }} />);
      // Sem encolher: é a largura que alinha "Compra"/"Venda" entre as linhas.
      expect(getByText(ticker)).toHaveClass("min-w-18", "shrink-0");
      unmount();
    }
  });
});
