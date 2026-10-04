import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { Orders } from "@/pages/Orders";

vi.mock("@/hooks/use-orders", () => ({
  useOrders: () => ({ data: { items: [] }, error: null, isLoading: false, refetch: vi.fn() }),
  useCancelOrder: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/use-free-balance", () => ({
  useFreeBalance: () => ({ free: 0, reserved: 0, reservedPositions: {}, refetch: vi.fn() }),
}));
vi.mock("@/components/orders/NewOrderForm", () => ({ NewOrderForm: () => null }));
// O Painel só precisa decidir o redirecionamento; os dados ficam carregando.
vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolio: () => ({ balance: 0, isLoading: true, error: null, refetch: vi.fn() }),
  usePortfolioHistory: () => ({
    history: [],
    intraday: false,
    returnPct: null,
    isLoading: true,
    error: null,
    refetch: vi.fn(),
  }),
}));

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/caixinha" element={<p>Página da Caixinha</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Links antigos da Caixinha vão para /caixinha", () => {
  it.each(["/orders#caixinha", "/#caixinha"])("%s abre a página da Caixinha", (url) => {
    renderAt(url);

    expect(screen.getByText("Página da Caixinha")).toBeInTheDocument();
  });

  it("Ordens sem a âncora não mostra a Caixinha", () => {
    renderAt("/orders");

    expect(screen.getByRole("heading", { name: "Ordens" })).toBeInTheDocument();
    expect(screen.queryByText(/Caixinha/i)).not.toBeInTheDocument();
  });
});
