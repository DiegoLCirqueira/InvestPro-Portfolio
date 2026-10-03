import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";
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

// Venda executada: o servidor não devolve PM.
const sellOrder: Order = { ...filledOrder, id: "2", side: "SELL", avgPrice: null };

// Pares rótulo → valor da grade de uma linha, na ordem em que aparecem.
function detailsOf(order: Order) {
  const { container, unmount } = render(<OrderRow order={order} />);
  const grid = container.querySelector("dl") as HTMLElement;
  const details = Array.from(grid.children).map((cell) => ({
    label: within(cell as HTMLElement).getByRole("term").textContent,
    value: within(cell as HTMLElement).getByRole("definition").textContent,
  }));
  unmount();
  return details;
}

describe("OrderRow", () => {
  it("mostra Qtd, Preço, PM e Taxa como células da grade, em reais no padrão pt-BR", () => {
    const details = detailsOf(filledOrder);

    expect(details.map((d) => d.label)).toEqual(["Qtd", "Preço", "PM", "Taxa"]);
    expect(details[0].value).toBe("1.000");
    expect(details[1].value).toMatch(/^R\$\s42,33$/);
    expect(details[2].value).toMatch(/^R\$\s42,33$/);
    expect(details[3].value).toMatch(/^R\$\s0,42$/);
  });

  it("na venda o PM fica vazio no mesmo lugar: as 4 células se mantêm e a Taxa não se desloca", () => {
    const buy = detailsOf(filledOrder);
    const sell = detailsOf(sellOrder);

    expect(sell.map((d) => d.label)).toEqual(buy.map((d) => d.label));
    expect(sell[2].value).toBe("—sem valor");
    expect(sell[3].value).toMatch(/^R\$\s0,42$/);
  });

  it("ordem ainda não executada mantém as 4 células, com a taxa vazia", () => {
    const pending = detailsOf({ ...filledOrder, status: "PENDING", avgPrice: null, fee: null });

    expect(pending).toHaveLength(4);
    expect(pending[3].value).toBe("—sem valor");
  });

  it("no celular a grade é 2x2 e vira 4 colunas a partir do sm", () => {
    const { container } = render(<OrderRow order={filledOrder} />);

    expect(container.querySelector("dl")).toHaveClass("grid-cols-2", "sm:grid-cols-4");
  });
});
