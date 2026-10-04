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

// Saldo em conta: alto por padrão, para os testes que não tratam de saldo não esbarrarem nele.
const mockPortfolio = vi.hoisted(() => ({ balance: 1_000_000, refetch: vi.fn() }));

vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolioPositions: () => ({
    data: { balance: mockPortfolio.balance },
    balance: mockPortfolio.balance,
    refetch: mockPortfolio.refetch,
  }),
  useTopUpLimit: () => ({
    data: { limit: 3_000_000, used: 0, remaining: 3_000_000 },
    refetch: vi.fn(),
  }),
  useTopUpPortfolio: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Caixinha vazia por padrão: sem dinheiro nela o formulário não oferece usá-la.
const mockSavingsBox = vi.hoisted(() => ({ balance: 0 }));

vi.mock("@/hooks/use-savings-box", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-savings-box")>()),
  useSavingsBox: () => ({
    data: { balance: mockSavingsBox.balance },
    balance: mockSavingsBox.balance,
    refetch: vi.fn(),
  }),
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
    mockPortfolio.balance = 1_000_000;
    mockSavingsBox.balance = 0;
    useInsufficientBalanceStore.setState({ isOpen: false });
  });

  describe("saldo verificado antes de enviar (compra)", () => {
    // PETR4 a R$ 30: 10 unidades = R$ 300 + R$ 3 de taxa = R$ 303.
    const buyTenPetr4 = () => {
      typeTicker("PETR4");
      fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "10" } });
    };
    const submitButton = () => screen.getByRole("button", { name: "Enviar Ordem" });

    it("mostra o Saldo disponível na compra", () => {
      mockPortfolio.balance = 550;
      renderForm();

      expect(screen.getByText("Saldo disponível")).toBeInTheDocument();
      expect(screen.getByText(/R\$\s?550,00/)).toBeInTheDocument();
    });

    it("não deixa enviar compra sem saldo e diz quanto falta", () => {
      mockPortfolio.balance = 100;
      renderForm();
      buyTenPetr4();

      const alert = screen.getByText(/Faltam/).closest("[role=status]") as HTMLElement;
      expect(alert).toHaveTextContent(/Faltam R\$\s?203,00 para esta ordem/);
      expect(alert).toHaveTextContent(/Você pagará R\$\s?303,00 e tem R\$\s?100,00 em conta\./);
      expect(submitButton()).toBeDisabled();
      expect(submitButton()).toHaveAccessibleDescription(/Faltam R\$\s?203,00/);

      fireEvent.submit(submitButton().closest("form") as HTMLFormElement);
      expect(mockCreateOrder.mutate).not.toHaveBeenCalled();
    });

    it("'Adicionar saldo grátis' abre o depósito com o valor que falta", () => {
      mockPortfolio.balance = 100;
      renderForm();
      buyTenPetr4();

      fireEvent.click(screen.getByRole("button", { name: "Adicionar saldo grátis" }));

      const dialog = screen.getByRole("dialog", { name: "Adicionar saldo grátis" });
      expect((screen.getByLabelText("Valor a adicionar") as HTMLInputElement).value).toMatch(
        /203,00/,
      );
      expect(dialog).toHaveTextContent("Valor que falta para a sua ordem de PETR4.");
    });

    it("com saldo suficiente não há aviso e a ordem pode ser enviada", () => {
      mockPortfolio.balance = 303;
      renderForm();
      buyTenPetr4();

      expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();
      expect(submitButton()).toBeEnabled();
    });

    it("na venda mostra só o saldo, sem aviso: a checagem é de quantidade", () => {
      mockPortfolio.balance = 0;
      mockSellable.assets = [{ ticker: "PETR4", quantity: 20 }];
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: "Venda" }));
      buyTenPetr4();

      expect(screen.getByText("Saldo disponível")).toBeInTheDocument();
      expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();
      expect(submitButton()).toBeEnabled();
    });
  });

  describe("usar a Caixinha se faltar (compra)", () => {
    // PETR4 a R$ 30: 10 unidades = R$ 300 + R$ 3 de taxa = R$ 303.
    const buyTenPetr4 = () => {
      typeTicker("PETR4");
      fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "10" } });
    };
    const submitButton = () => screen.getByRole("button", { name: "Enviar Ordem" });
    const checkbox = () =>
      screen.getByRole("checkbox", { name: /Usar saldo da Caixinha se faltar/ });

    it("sem dinheiro na Caixinha, não oferece usá-la", () => {
      mockSavingsBox.balance = 0;
      renderForm();

      expect(screen.queryByText("Na Caixinha")).not.toBeInTheDocument();
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("falta em conta e a Caixinha cobre: mostra a divisão e envia useSavingsBox=true", async () => {
      mockPortfolio.balance = 100;
      mockSavingsBox.balance = 3_000;
      mockCreateOrder.mutate.mockResolvedValue({} as Order);
      renderForm();
      buyTenPetr4();

      fireEvent.click(checkbox());
      const split = screen.getByText("Como esta compra será paga").closest("[role=status]") as HTMLElement;
      expect(split).toHaveTextContent(/Do Saldo em conta\s*R\$\s?100,00/);
      expect(split).toHaveTextContent(/Da Caixinha\s*\+ R\$\s?203,00/);
      expect(split).toHaveTextContent(/Total\s*R\$\s?303,00/);
      expect(split).toHaveTextContent(/A Caixinha fica com R\$\s?2\.797,00\./);
      expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();

      fireEvent.click(submitButton());

      await waitFor(() =>
        expect(mockCreateOrder.mutate).toHaveBeenCalledWith(
          expect.objectContaining({ ticker: "PETR4", side: "BUY", useSavingsBox: true }),
        ),
      );
    });

    it("com saldo em conta suficiente, avisa que a Caixinha não é usada", () => {
      mockPortfolio.balance = 500;
      mockSavingsBox.balance = 3_000;
      renderForm();
      buyTenPetr4();
      fireEvent.click(checkbox());

      expect(screen.getByText("Tudo sai do Saldo em conta. A Caixinha não é usada.")).toBeInTheDocument();
      expect(screen.queryByText("Como esta compra será paga")).not.toBeInTheDocument();
      expect(submitButton()).toBeEnabled();
    });

    it("vem desmarcada (opt-in): falta em conta barra o envio até a pessoa marcar", () => {
      mockPortfolio.balance = 100;
      mockSavingsBox.balance = 3_000;
      renderForm();
      buyTenPetr4();

      expect(checkbox()).not.toBeChecked();
      expect(screen.getByText(/Faltam/)).toHaveTextContent(/Faltam R\$\s?203,00 para esta ordem/);
      expect(submitButton()).toBeDisabled();
    });

    it("depois de enviar, volta desmarcada para a próxima ordem", async () => {
      mockPortfolio.balance = 100;
      mockSavingsBox.balance = 3_000;
      mockCreateOrder.mutate.mockResolvedValue({} as Order);
      renderForm();
      buyTenPetr4();
      fireEvent.click(checkbox());

      fireEvent.click(submitButton());

      await waitFor(() => expect(checkbox()).not.toBeChecked());
    });

    it("nem a soma basta: diz quanto falta mesmo com a Caixinha e não deixa enviar", () => {
      mockPortfolio.balance = 100;
      mockSavingsBox.balance = 100;
      renderForm();
      buyTenPetr4();
      fireEvent.click(checkbox());

      const alert = screen.getByText(/Faltam/).closest("[role=status]") as HTMLElement;
      expect(alert).toHaveTextContent(/Faltam R\$\s?103,00, mesmo usando a Caixinha/);
      expect(alert).toHaveTextContent(
        /Você pagará R\$\s?303,00; tem R\$\s?100,00 em conta e R\$\s?100,00 na Caixinha\./,
      );
      expect(submitButton()).toBeDisabled();

      fireEvent.click(screen.getByRole("button", { name: "Adicionar saldo grátis" }));
      expect((screen.getByLabelText("Valor a adicionar") as HTMLInputElement).value).toMatch(
        /103,00/,
      );
    });

    it("venda nunca oferece a Caixinha nem envia useSavingsBox", async () => {
      mockSavingsBox.balance = 3_000;
      mockSellable.assets = [{ ticker: "PETR4", quantity: 20 }];
      mockCreateOrder.mutate.mockResolvedValue({} as Order);
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: "Venda" }));
      buyTenPetr4();

      expect(screen.queryByText("Na Caixinha")).not.toBeInTheDocument();
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

      fireEvent.click(submitButton());

      await waitFor(() => expect(mockCreateOrder.mutate).toHaveBeenCalled());
      expect(mockCreateOrder.mutate.mock.calls[0][0]).not.toHaveProperty("useSavingsBox");
    });
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
      typeAmount("107"); // R$ 1,07 / R$ 100 = 0,0107 BTC

      fireEvent.click(screen.getByRole("button", { name: "Enviar Ordem" }));

      await waitFor(() =>
        expect(mockCreateOrder.mutate).toHaveBeenCalledWith(
          expect.objectContaining({ ticker: "BTC", side: "BUY", quantity: 0.0107 }),
        ),
      );
    });

    it("abaixo de R$ 1,00 avisa o mínimo e desabilita o envio", () => {
      renderForm();
      typeTicker("BTC");
      typeAmount("50"); // R$ 0,50

      expect(screen.getByRole("alert")).toHaveTextContent(/O valor mínimo por ordem é R\$\s1,00/);
      expect(screen.getByRole("button", { name: "Enviar Ordem" })).toBeDisabled();
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
