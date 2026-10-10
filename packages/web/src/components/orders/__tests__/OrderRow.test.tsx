import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("preço e PM com mais de 2 casas aparecem com até 4 (como o servidor executou)", () => {
    const { container } = render(
      <OrderRow order={{ ...filledOrder, quantity: 300, price: 4.9918, avgPrice: 4.9918, fee: 14.98 }} />,
    );
    const text = container.textContent ?? "";

    expect(text).toMatch(/Preço: R\$\s4,9918/);
    expect(text).toMatch(/PM: R\$\s4,9918/);
    expect(text).toMatch(/Taxa: R\$\s14,98/);
  });

  it("compra 300 × 4,9918: preço R$ 4,9918, taxa R$ 14,98 e o total debitado pelo servidor", () => {
    const { container } = render(
      <OrderRow
        order={{
          ...filledOrder,
          quantity: 300,
          price: 4.9918,
          avgPrice: 4.9918,
          fee: 14.98,
          netAmount: 1_512.52,
        }}
      />,
    );
    const text = container.textContent ?? "";

    expect(text).toMatch(/Preço: R\$\s4,9918/);
    expect(text).toMatch(/Taxa: R\$\s14,98/);
    expect(text).toMatch(/Total: R\$\s1\.512,52/);
  });

  it("ordem antiga (ou aberta) sem netAmount: sem Total, como antes", () => {
    const { container } = render(<OrderRow order={filledOrder} />);

    expect(container.textContent ?? "").not.toMatch(/Total/);
  });

  it("o ticker tem a mesma largura mínima em toda linha, curto ou longo", () => {
    for (const ticker of ["BTC", "ITUB4", "USDBRL"]) {
      const { getByText, unmount } = render(<OrderRow order={{ ...filledOrder, ticker }} />);
      // Sem encolher: é a largura que alinha "Compra"/"Venda" entre as linhas.
      expect(getByText(ticker)).toHaveClass("min-w-18", "shrink-0");
      unmount();
    }
  });

  it("Compra e Venda têm a mesma largura mínima: a etiqueta do tipo alinha entre as linhas", () => {
    for (const [side, label] of [["BUY", "Compra"], ["SELL", "Venda"]] as const) {
      const { unmount } = render(<OrderRow order={{ ...filledOrder, side }} />);
      expect(screen.getByText(label)).toHaveClass("min-w-17", "shrink-0");
      unmount();
    }
  });

  it("Cancelar só aparece em ordens abertas ou pendentes", () => {
    for (const status of ["OPEN", "PENDING"] as const) {
      const onCancel = vi.fn();
      const { unmount } = render(
        <OrderRow order={{ ...filledOrder, type: "LIMIT", status }} onCancel={onCancel} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Cancelar ordem de compra de 1.000 ITUB4" }));
      expect(onCancel).toHaveBeenCalledWith(
        expect.objectContaining({ id: "1" }),
        expect.any(HTMLButtonElement),
      );
      unmount();
    }
    for (const status of ["FILLED", "CANCELLED", "REJECTED", "PARTIALLY_FILLED"] as const) {
      const { unmount } = render(<OrderRow order={{ ...filledOrder, status }} onCancel={vi.fn()} />);
      expect(screen.queryByRole("button", { name: /Cancelar/ })).not.toBeInTheDocument();
      unmount();
    }
  });
});
