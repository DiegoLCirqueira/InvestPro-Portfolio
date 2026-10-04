import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Orders } from "@/pages/Orders";
import type { Order } from "@/types/order";

const openSell: Order = {
  id: "ord-1",
  assetId: "a",
  ticker: "PETR4",
  side: "SELL",
  type: "LIMIT",
  quantity: 2,
  price: 95,
  status: "OPEN",
  createdAt: "2026-10-04T10:00:00.000Z",
  executedAt: null,
  avgPrice: null,
};

vi.mock("@/hooks/use-orders", () => ({
  useOrders: () => ({ data: { items: [openSell] }, error: null, isLoading: false, refetch: vi.fn() }),
  // Como o useMutation real: resolve e chama o onSuccess do hook.
  useCancelOrder: (options: { onSuccess?: (order: Order) => void }) => ({
    mutate: async () => {
      const cancelled = { ...openSell, status: "CANCELLED" as const };
      options.onSuccess?.(cancelled);
      return cancelled;
    },
    isPending: false,
  }),
}));
vi.mock("@/components/orders/NewOrderForm", () => ({ NewOrderForm: () => null }));
vi.mock("@/hooks/use-free-balance", () => ({
  useFreeBalance: () => ({ free: 0, reserved: 0, reservedPositions: {}, refetch: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function renderPage() {
  render(
    <MemoryRouter>
      <Orders />
    </MemoryRouter>,
  );
}

const cancelButton = () =>
  screen.getByRole("button", { name: "Cancelar ordem de venda de 2 PETR4" });

describe("Ordens: foco ao cancelar pelo Histórico", () => {
  it("Voltar devolve o foco ao botão Cancelar da linha", async () => {
    renderPage();

    fireEvent.click(cancelButton());
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));

    await waitFor(() => expect(cancelButton()).toHaveFocus());
  });

  it("depois de cancelar, o foco vai para o título do Histórico (o botão some)", async () => {
    renderPage();

    fireEvent.click(cancelButton());
    fireEvent.click(screen.getByRole("button", { name: "Cancelar ordem" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Histórico de Ordens" })).toHaveFocus(),
    );
  });
});
