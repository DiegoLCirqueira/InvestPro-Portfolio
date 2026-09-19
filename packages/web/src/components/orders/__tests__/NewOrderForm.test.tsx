import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NewOrderForm } from "@/components/orders/NewOrderForm";
import { ApiError } from "@/services/api";
import { useInsufficientBalanceStore } from "@/stores/insufficient-balance";
import type { Order, SellableAsset } from "@/types/order";

const mockSellable = vi.hoisted(() => ({
  assets: [] as SellableAsset[],
  isLoading: false,
}));

const mockCreateOrder = vi.hoisted(() => ({
  mutate: vi.fn(),
  onError: undefined as undefined | ((error: Error) => void),
}));

vi.mock("@/hooks/use-market-assets", () => ({
  useMarketAssets: () => ({
    data: {
      items: [
        { id: "1", ticker: "PETR4", name: "Petrobras", type: "STOCK", price: 30, change24h: 0 },
        { id: "2", ticker: "BTC", name: "Bitcoin", type: "CRYPTO", price: 100, change24h: 0 },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-orders", () => ({
  useSellableAssets: () => ({
    sellableAssets: mockSellable.assets,
    isLoading: mockSellable.isLoading,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateOrder: (options: { onError?: (error: Error) => void }) => {
    mockCreateOrder.onError = options.onError;
    return { mutate: mockCreateOrder.mutate, isPending: false, error: null };
  },
}));

const getTickerInput = () => screen.getByPlaceholderText("ex.: PETR4") as HTMLInputElement;

function typeTicker(ticker: string) {
  fireEvent.change(getTickerInput(), { target: { value: ticker } });
}

describe("NewOrderForm", () => {
  beforeEach(() => {
    mockSellable.assets = [];
    mockSellable.isLoading = false;
    mockCreateOrder.mutate.mockReset();
    useInsufficientBalanceStore.setState({ isOpen: false });
  });

  it("compra mostra a taxa de 1% e 'Você pagará' somando-a ao total", () => {
    render(<NewOrderForm onCreated={vi.fn()} />);
    typeTicker("BTC");
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "10" } });

    expect(screen.getByText("Taxa InvestPro (1%)")).toBeTruthy();
    expect(screen.getByText("Você pagará")).toBeTruthy();
    expect(screen.getByText(/1\.010,00/)).toBeTruthy();
  });

  it("venda sem posições mostra o estado vazio e bloqueia o envio", () => {
    render(<NewOrderForm onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Venda" }));

    expect(
      screen.getByText(/Você ainda não possui ativos para vender/),
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Enviar Ordem" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("venda limpa o ticker que não é possuído e barra quantidade acima da posição", () => {
    mockSellable.assets = [{ ticker: "BTC", quantity: 2 }];
    render(<NewOrderForm onCreated={vi.fn()} />);
    typeTicker("PETR4");
    fireEvent.click(screen.getByRole("button", { name: "Venda" }));
    expect(getTickerInput().value).toBe("");

    typeTicker("BTC");
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "3" } });
    expect(screen.getByRole("alert").textContent).toContain("Você possui apenas 2 de BTC");
    expect(screen.getByText("Você receberá")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Enviar Ordem" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  describe("envio", () => {
    const fillBuyOrder = () => {
      typeTicker("BTC");
      fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "1" } });
      return screen.getByRole("button", { name: "Enviar Ordem" }).closest("form") as HTMLFormElement;
    };

    it("três envios no mesmo tick criam UMA ordem só", async () => {
      let finishOrder: (order: Order) => void = () => {};
      mockCreateOrder.mutate.mockReturnValue(
        new Promise<Order>((resolve) => (finishOrder = resolve)),
      );
      render(<NewOrderForm onCreated={vi.fn()} />);
      const form = fillBuyOrder();

      fireEvent.submit(form);
      fireEvent.submit(form);
      fireEvent.submit(form);
      expect(mockCreateOrder.mutate).toHaveBeenCalledTimes(1);

      finishOrder({} as Order);
      await waitFor(() => expect(getTickerInput().value).toBe(""));
    });

    it("saldo insuficiente abre o pop-up e não deixa texto de erro no formulário", async () => {
      mockCreateOrder.mutate.mockImplementation(async () => {
        const error = new ApiError(
          400,
          "Saldo insuficiente para esta ordem",
          "ORDER_INSUFFICIENT_BALANCE",
        );
        mockCreateOrder.onError?.(error);
        throw error;
      });
      render(<NewOrderForm onCreated={vi.fn()} />);

      fireEvent.submit(fillBuyOrder());

      await waitFor(() => expect(useInsufficientBalanceStore.getState().isOpen).toBe(true));
      expect(screen.queryByText(/Saldo insuficiente/)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Venda" }));
      expect(screen.queryByText(/Saldo insuficiente/)).not.toBeInTheDocument();
    });
  });
});
