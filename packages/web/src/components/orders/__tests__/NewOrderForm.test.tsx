import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NewOrderForm } from "@/components/orders/NewOrderForm";
import { ApiError } from "@/services/api";
import { useInsufficientBalanceStore } from "@/stores/insufficient-balance";
import type { Order, SellableAsset } from "@/types/order";

const mockSellable = vi.hoisted(() => ({
  assets: [] as SellableAsset[],
  isLoading: false,
}));

// PETR4 sem priceSource (= ao vivo), BTC estimado ("seed"), ITUB4 explicitamente ao vivo.
const mockMarket = vi.hoisted(() => ({
  items: [
    {
      id: "1",
      ticker: "PETR4",
      name: "Petrobras",
      type: "STOCK",
      price: 30,
      change24h: 0,
    },
    {
      id: "2",
      ticker: "BTC",
      name: "Bitcoin",
      type: "CRYPTO",
      price: 100,
      change24h: 0,
      priceSource: "seed",
    },
    {
      id: "3",
      ticker: "ITUB4",
      name: "Itaú",
      type: "STOCK",
      price: 40,
      change24h: 0,
      priceSource: "live",
    },
  ],
}));

const mockCreateOrder = vi.hoisted(() => ({
  mutate: vi.fn(),
  onError: undefined as undefined | ((error: Error) => void),
}));

vi.mock("@/hooks/use-market-assets", () => ({
  useMarketAssets: () => ({
    data: { items: mockMarket.items },
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

// O formulário lê ?ticker= (clique num ativo do Mercado), então precisa de um roteador.
function renderForm(path = "/orders") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NewOrderForm onCreated={vi.fn()} />
    </MemoryRouter>,
  );
}

const getTickerInput = () =>
  screen.getByPlaceholderText("ex.: PETR4") as HTMLInputElement;

function typeTicker(ticker: string) {
  fireEvent.change(getTickerInput(), { target: { value: ticker } });
}

const chooseEntryMode = (label: "Quantidade" | "Valor em R$") =>
  fireEvent.click(screen.getByRole("button", { name: label }));

// Dígitos do campo de moeda: "10000" = R$ 100,00.
const typeAmount = (digits: string) =>
  fireEvent.change(screen.getByLabelText("Valor em R$"), { target: { value: digits } });

describe("NewOrderForm", () => {
  beforeEach(() => {
    mockSellable.assets = [];
    mockSellable.isLoading = false;
    mockCreateOrder.mutate.mockReset();
    useInsufficientBalanceStore.setState({ isOpen: false });
  });

  it("enviar vazio marca Ativo e Quantidade na tela, sem enviar a ordem", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: /Enviar Ordem/ }));

    expect(await screen.findByText("Escolha um ativo.")).toBeInTheDocument();
    expect(
      screen.getByText("Informe uma quantidade maior que zero."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Quantidade")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(mockCreateOrder.mutate).not.toHaveBeenCalled();
  });

  it("vindo do Mercado (?ticker=), o ativo já vem escolhido", () => {
    renderForm("/orders?ticker=ITUB4");

    expect(getTickerInput().value).toBe("ITUB4");
  });

  it("compra mostra a taxa de 1% e 'Você pagará' somando-a ao total", () => {
    renderForm();
    typeTicker("BTC");
    chooseEntryMode("Quantidade");
    fireEvent.change(screen.getByLabelText("Quantidade"), {
      target: { value: "10" },
    });

    expect(screen.getByText("Taxa InvestPro (1%)")).toBeTruthy();
    expect(screen.getByText("Você pagará")).toBeTruthy();
    expect(screen.getByText(/1\.010,00/)).toBeTruthy();
  });

  it("Valor total é uma linha de resumo calculada, não um campo para digitar", () => {
    renderForm();
    typeTicker("BTC");
    chooseEntryMode("Quantidade");
    fireEvent.change(screen.getByLabelText("Quantidade"), {
      target: { value: "10" },
    });

    expect(screen.getByText("Valor total")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Valor total" })).not.toBeInTheDocument();
  });

  it("ativo com preço 'seed' mostra a nota de preço estimado sob o Valor total; ao vivo não", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Quantidade"), {
      target: { value: "1" },
    });

    typeTicker("BTC");
    expect(
      screen.getByText("Preço estimado; o valor executado pode diferir."),
    ).toBeInTheDocument();

    typeTicker("PETR4");
    expect(screen.queryByText(/Preço estimado/)).not.toBeInTheDocument();

    typeTicker("ITUB4");
    expect(screen.queryByText(/Preço estimado/)).not.toBeInTheDocument();
  });

  it("venda sem posições mostra o estado vazio e bloqueia o envio", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Venda" }));

    expect(
      screen.getByText(/Você ainda não possui ativos para vender/),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Enviar Ordem",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("venda limpa o ticker que não é possuído e barra quantidade acima da posição", () => {
    mockSellable.assets = [{ ticker: "BTC", quantity: 2 }];
    renderForm();
    typeTicker("PETR4");
    fireEvent.click(screen.getByRole("button", { name: "Venda" }));
    expect(getTickerInput().value).toBe("");

    typeTicker("BTC");
    fireEvent.change(screen.getByLabelText("Quantidade"), {
      target: { value: "3" },
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Você possui apenas 2 de BTC",
    );
    expect(screen.getByText("Você receberá")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Enviar Ordem",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  describe("compra de cripto por valor em R$", () => {
    it("cripto abre no modo Valor: mostra a quantidade estimada, a taxa e 'Você pagará'", () => {
      renderForm();
      typeTicker("BTC");

      expect(screen.getByRole("button", { name: "Valor em R$" })).toHaveAttribute("aria-pressed", "true");
      typeAmount("10000"); // R$ 100,00 a R$ 100 por BTC

      expect(screen.getByText(/Quantidade estimada/)).toHaveTextContent("1 BTC");
      expect(screen.getByText("Você pagará")).toBeInTheDocument();
      expect(screen.getByText(/R\$\s?101,00/)).toBeInTheDocument();
    });

    it("envia a quantidade calculada (a API continua recebendo quantity)", async () => {
      mockCreateOrder.mutate.mockResolvedValue({} as Order);
      renderForm();
      typeTicker("BTC");
      typeAmount("7"); // R$ 0,07 / R$ 100 = 0,0007 BTC

      fireEvent.click(screen.getByRole("button", { name: "Enviar Ordem" }));

      await waitFor(() =>
        expect(mockCreateOrder.mutate).toHaveBeenCalledWith(
          expect.objectContaining({ ticker: "BTC", side: "BUY", quantity: 0.0007 }),
        ),
      );
    });

    it("sem valor, marca o campo e não envia", async () => {
      renderForm();
      typeTicker("BTC");

      fireEvent.click(screen.getByRole("button", { name: "Enviar Ordem" }));

      expect(await screen.findByText("Informe um valor maior que R$ 0,00.")).toBeInTheDocument();
      expect(screen.getByLabelText("Valor em R$")).toHaveAttribute("aria-invalid", "true");
      expect(mockCreateOrder.mutate).not.toHaveBeenCalled();
    });

    it("ações e venda não oferecem o modo Valor", () => {
      mockSellable.assets = [{ ticker: "BTC", quantity: 2 }];
      renderForm();
      typeTicker("PETR4");
      expect(screen.queryByRole("button", { name: "Valor em R$" })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Venda" }));
      typeTicker("BTC");
      expect(screen.queryByRole("button", { name: "Valor em R$" })).not.toBeInTheDocument();
      expect(screen.getByLabelText("Quantidade")).toBeInTheDocument();
    });
  });

  describe("envio", () => {
    const fillBuyOrder = () => {
      typeTicker("BTC");
      chooseEntryMode("Quantidade");
      fireEvent.change(screen.getByLabelText("Quantidade"), {
        target: { value: "1" },
      });
      return screen
        .getByRole("button", { name: "Enviar Ordem" })
        .closest("form") as HTMLFormElement;
    };

    it("três envios no mesmo tick criam UMA ordem só", async () => {
      let finishOrder: (order: Order) => void = () => {};
      mockCreateOrder.mutate.mockReturnValue(
        new Promise<Order>((resolve) => (finishOrder = resolve)),
      );
      renderForm();
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
      renderForm();

      fireEvent.submit(fillBuyOrder());

      await waitFor(() =>
        expect(useInsufficientBalanceStore.getState().isOpen).toBe(true),
      );
      expect(screen.queryByText(/Saldo insuficiente/)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Venda" }));
      expect(screen.queryByText(/Saldo insuficiente/)).not.toBeInTheDocument();
    });
  });
});
