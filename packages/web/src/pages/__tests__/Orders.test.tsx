import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Orders } from "@/pages/Orders";

vi.mock("@/hooks/use-orders", () => ({
  useOrders: () => ({ data: { items: [] }, error: null, isLoading: false, refetch: vi.fn() }),
}));
vi.mock("@/components/orders/NewOrderForm", () => ({ NewOrderForm: () => null }));

function PainelProbe() {
  const { hash } = useLocation();
  return <p>Painel {hash}</p>;
}

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/" element={<PainelProbe />} />
        <Route path="/orders" element={<Orders />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Orders: Caixinha mudou para o Painel", () => {
  it("o link antigo /orders#caixinha abre o Painel na Caixinha", () => {
    renderAt("/orders#caixinha");

    expect(screen.getByText("Painel #caixinha")).toBeInTheDocument();
  });

  it("Ordens não mostra mais a Caixinha", () => {
    renderAt("/orders");

    expect(screen.getByRole("heading", { name: "Ordens" })).toBeInTheDocument();
    expect(screen.queryByText(/Caixinha/i)).not.toBeInTheDocument();
  });
});
