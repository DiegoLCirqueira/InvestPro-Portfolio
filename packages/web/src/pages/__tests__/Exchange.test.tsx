import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import { Exchange } from "@/pages/Exchange";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/financial-error";
import { ApiError } from "@/services/api";
import { useInsufficientBalanceStore } from "@/stores/insufficient-balance";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const QUOTE = {
  from: "BRL", to: "USD", amount: 10, convertedAmount: 1.93, rate: 0.1944, fee: 0.1,
  timestamp: "2026-09-19T15:00:00.000Z",
};
// Cotação mudou entre simular e realizar: o que vale é o que o servidor executou.
const EXECUTION = {
  id: "e1", fromCurrency: "BRL", toCurrency: "USD", amount: 10, convertedAmount: 1.91,
  rate: 0.191, fee: 0.1, createdAt: "2026-09-19T15:01:00.000Z",
};

const postsTo = (path: string) => apiMock.post.mock.calls.filter(([url]) => url === path);

function mockApi({ convert = () => Promise.resolve(QUOTE), execute = () => Promise.resolve(EXECUTION) } = {}) {
  apiMock.get.mockResolvedValue({ base: "BRL", items: ["BRL", "USD", "EUR"] });
  apiMock.post.mockImplementation((path: string) =>
    path === "/exchange/convert" ? convert() : path === "/exchange/execute" ? execute() : Promise.reject(new Error(path)),
  );
}

async function renderExchange() {
  render(<MemoryRouter><Exchange /></MemoryRouter>);
  // O título é o mesmo nome do item do menu, como h1 da página.
  await screen.findByRole("heading", { level: 1, name: "Câmbio" });
}

const typeAmount = (digits: string) =>
  fireEvent.change(screen.getByLabelText("Valor a converter"), { target: { value: digits } });
const clickConvert = () => fireEvent.click(screen.getByRole("button", { name: "Converter" }));
const realizeButton = () => screen.queryByRole("button", { name: "Realizar conversão" });

async function simulate() {
  typeAmount("1000");
  clickConvert();
  await screen.findByRole("button", { name: "Realizar conversão" });
}

async function chooseCurrency(selectId: string, optionName: RegExp) {
  fireEvent.click(document.getElementById(selectId) as HTMLElement);
  fireEvent.click(await screen.findByRole("option", { name: optionName }));
}

describe("Exchange (simular e depois realizar)", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
    useInsufficientBalanceStore.setState({ isOpen: false });
  });

  it("antes de simular não existe 'Realizar conversão'", async () => {
    mockApi();
    await renderExchange();

    expect(realizeButton()).not.toBeInTheDocument();
    expect(screen.getByText(/clique em Converter para simular/)).toBeInTheDocument();
  });

  it("'Converter' só simula (POST /convert) e mostra taxa e valores, sem executar", async () => {
    mockApi();
    await renderExchange();

    await simulate();

    expect(postsTo("/exchange/convert")).toEqual([["/exchange/convert", { from: "BRL", to: "USD", amount: 10 }]]);
    expect(postsTo("/exchange/execute")).toHaveLength(0);
    expect(screen.getByText("Simulação")).toBeInTheDocument();
    expect(screen.getByText("0,1944")).toBeInTheDocument();
    expect(screen.getByText(/A cotação pode variar/)).toBeInTheDocument();
  });

  it("'Realizar conversão' executa, mostra o que FOI executado e limpa o formulário", async () => {
    mockApi();
    await renderExchange();
    await simulate();

    fireEvent.click(realizeButton() as HTMLElement);

    await screen.findByText("Conversão realizada");
    expect(postsTo("/exchange/execute")).toEqual([["/exchange/execute", { from: "BRL", to: "USD", amount: 10 }]]);
    expect(screen.getByText("0,1910")).toBeInTheDocument();
    expect(screen.getByText(/US\$\s1,91/)).toBeInTheDocument();
    expect(screen.queryByText("0,1944")).not.toBeInTheDocument();
    expect((screen.getByLabelText("Valor a converter") as HTMLInputElement).value).toMatch(/R\$\s0,00/);
    expect(realizeButton()).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalled();
  });

  it("mudar o valor depois de simular invalida o resultado e esconde 'Realizar conversão'", async () => {
    mockApi();
    await renderExchange();
    await simulate();

    typeAmount("2000");

    expect(realizeButton()).not.toBeInTheDocument();
    expect(screen.queryByText("Simulação")).not.toBeInTheDocument();
  });

  it("mudar De ou Para depois de simular também invalida", async () => {
    mockApi();
    await renderExchange();
    await simulate();
    await chooseCurrency("exchange-to", /EUR/);
    expect(realizeButton()).not.toBeInTheDocument();

    clickConvert();
    await screen.findByRole("button", { name: "Realizar conversão" });
    fireEvent.click(screen.getByRole("button", { name: "Inverter moedas" }));
    expect(realizeButton()).not.toBeInTheDocument();
  });

  describe("a simulação é descartada, não só escondida", () => {
    const expectDiscardedUntilConvertAgain = async () => {
      expect(realizeButton()).not.toBeInTheDocument();
      expect(screen.queryByText("Simulação")).not.toBeInTheDocument();
      expect(postsTo("/exchange/convert")).toHaveLength(1);

      clickConvert();
      await screen.findByRole("button", { name: "Realizar conversão" });
      expect(postsTo("/exchange/convert")).toHaveLength(2);
    };

    it("mudar o valor e voltar ao valor anterior exige 'Converter' de novo", async () => {
      mockApi();
      await renderExchange();
      await simulate();

      typeAmount("2000");
      typeAmount("1000");

      await expectDiscardedUntilConvertAgain();
    });

    it("trocar o Para e voltar ao mesmo exige 'Converter' de novo", async () => {
      mockApi();
      await renderExchange();
      await simulate();

      await chooseCurrency("exchange-to", /EUR/);
      await chooseCurrency("exchange-to", /USD/);

      await expectDiscardedUntilConvertAgain();
    });

    it("inverter De/Para duas vezes (volta ao par original) exige 'Converter' de novo", async () => {
      mockApi();
      await renderExchange();
      await simulate();

      fireEvent.click(screen.getByRole("button", { name: "Inverter moedas" }));
      fireEvent.click(screen.getByRole("button", { name: "Inverter moedas" }));

      await expectDiscardedUntilConvertAgain();
    });

    it("uma simulação que responde DEPOIS de o valor mudar não é exibida", async () => {
      let answerConvert: (quote: typeof QUOTE) => void = () => {};
      mockApi({ convert: () => new Promise((resolve) => (answerConvert = resolve)) });
      await renderExchange();

      typeAmount("1000");
      clickConvert();
      typeAmount("2000");
      await act(async () => answerConvert(QUOTE));

      await screen.findByRole("button", { name: "Converter" });
      expect(realizeButton()).not.toBeInTheDocument();
      expect(screen.queryByText("Simulação")).not.toBeInTheDocument();
    });
  });

  it("três envios de 'Realizar conversão' no mesmo tick executam uma vez só", async () => {
    mockApi({ execute: () => new Promise(() => {}) });
    await renderExchange();
    await simulate();

    const form = (realizeButton() as HTMLElement).closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(postsTo("/exchange/execute")).toHaveLength(1);
  });

  it("saldo insuficiente na execução abre o pop-up e mantém a simulação para tentar de novo", async () => {
    mockApi({
      execute: () => Promise.reject(new ApiError(400, "Saldo insuficiente em BRL", "PORTFOLIO_INSUFFICIENT_BALANCE")),
    });
    await renderExchange();
    await simulate();

    fireEvent.click(realizeButton() as HTMLElement);

    await waitFor(() => expect(useInsufficientBalanceStore.getState().isOpen).toBe(true));
    expect(toast.error).not.toHaveBeenCalled();
    expect(realizeButton()).toBeInTheDocument();
  });

  it("503 (sem cotação viva) na execução mostra mensagem amigável", async () => {
    mockApi({
      execute: () => Promise.reject(new ApiError(503, "upstream", "EXCHANGE_RATE_UNAVAILABLE")),
    });
    await renderExchange();
    await simulate();

    fireEvent.click(realizeButton() as HTMLElement);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(SERVICE_UNAVAILABLE_MESSAGE, expect.any(Object)),
    );
    expect(realizeButton()).toBeInTheDocument();
  });

  it("503 na simulação avisa e não mostra 'Realizar conversão'", async () => {
    mockApi({ convert: () => Promise.reject(new ApiError(503, "upstream")) });
    await renderExchange();

    typeAmount("1000");
    clickConvert();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(SERVICE_UNAVAILABLE_MESSAGE, expect.any(Object)),
    );
    expect(realizeButton()).not.toBeInTheDocument();
  });

  it("valor zero ou moedas iguais não chamam a API", async () => {
    mockApi();
    await renderExchange();

    clickConvert();
    expect(toast.error).toHaveBeenCalledWith("Informe um valor válido.");

    typeAmount("1000");
    await chooseCurrency("exchange-to", /BRL/);
    clickConvert();
    expect(toast.error).toHaveBeenCalledWith("Selecione moedas diferentes para converter.");
    expect(postsTo("/exchange/convert")).toHaveLength(0);
    expect(within(document.body).queryByText("Simulação")).not.toBeInTheDocument();
  });
});

describe("Exchange: saldo disponível da moeda de origem", () => {
  beforeEach(() => {
    apiMock.get.mockReset().mockImplementation((path: string) => {
      if (path === "/portfolio") return Promise.resolve({ id: "p1", balance: 10_500_034.35, totalEquity: 1e9, positions: [] });
      if (path === "/exchange/holdings") return Promise.resolve({ items: [{ currency: "USD", balance: 190_639_474.22 }] });
      return Promise.resolve({ base: "BRL", items: ["BRL", "USD", "EUR"] });
    });
    apiMock.post.mockReset();
  });

  it("mostra o caixa em BRL (não o patrimônio total) e, ao trocar a origem, o saldo naquela moeda", async () => {
    await renderExchange();

    expect(await screen.findByText(/R\$\s?10\.500\.034,35/)).toBeInTheDocument();
    expect(screen.getByText(/Disponível em BRL/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Inverter moedas" }));

    expect(await screen.findByText(/Disponível em USD/)).toBeInTheDocument();
    expect(screen.getByText(/190\.639\.474,22/)).toBeInTheDocument();
  });
});

describe("Exchange: símbolo do campo de valor segue a moeda de origem", () => {
  beforeEach(() => {
    apiMock.get.mockReset().mockImplementation((path: string) => {
      if (path === "/portfolio") return Promise.resolve({ id: "p1", balance: 100, totalEquity: 100, positions: [] });
      if (path === "/exchange/holdings") return Promise.resolve({ items: [] });
      return Promise.resolve({ base: "BRL", items: ["BRL", "USD", "EUR"] });
    });
  });

  it("BRL mostra R$; ao inverter para USD, o campo passa a mostrar US$", async () => {
    await renderExchange();
    typeAmount("5000");
    expect((screen.getByLabelText("Valor a converter") as HTMLInputElement).value).toMatch(/R\$\s?50,00/);

    fireEvent.click(screen.getByRole("button", { name: "Inverter moedas" }));
    expect((screen.getByLabelText("Valor a converter") as HTMLInputElement).value).toMatch(/US\$\s?50,00/);
  });
});

describe("Exchange: botão de inverter no meio entre as duas caixas", () => {
  it("40px acima (gap 12 + rótulo e gap do Para) e 12px abaixo, sem gap no grupo", async () => {
    mockApi();
    await renderExchange();

    const swap = screen.getByRole("button", { name: "Inverter moedas" });
    expect(swap).toHaveClass("mt-10", "mb-3");
    expect(swap.parentElement).not.toHaveClass("gap-3");
  });
});

describe("Exchange: mínimo de R$ 1,00 por conversão", () => {
  beforeEach(() => {
    apiMock.post.mockReset();
    vi.mocked(toast.error).mockClear();
  });

  it("BRL abaixo de R$ 1,00: avisa no campo e não deixa simular", async () => {
    mockApi();
    await renderExchange();

    typeAmount("99");
    const field = screen.getByLabelText("Valor a converter");
    expect(field).toHaveAccessibleDescription("O valor mínimo por conversão é R$ 1,00");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Converter" })).toBeDisabled();

    typeAmount("100");
    expect(screen.queryByText("O valor mínimo por conversão é R$ 1,00")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Converter" })).toBeEnabled();
  });

  it("moeda estrangeira → BRL: abaixo de R$ 1,00 pela cotação simulada, não deixa realizar", async () => {
    // US$ 0,15 × 5,20 = R$ 0,78.
    mockApi({
      convert: () =>
        Promise.resolve({ ...QUOTE, from: "USD", to: "BRL", amount: 0.15, rate: 5.2, convertedAmount: 0.77, fee: 0 }),
    });
    await renderExchange();
    fireEvent.click(screen.getByRole("button", { name: "Inverter moedas" }));
    typeAmount("15");
    clickConvert();

    const realize = await screen.findByRole("button", { name: "Realizar conversão" });
    expect(realize).toBeDisabled();
    expect(realize).toHaveAccessibleDescription("O valor mínimo por conversão é R$ 1,00");
    expect(postsTo("/exchange/execute")).toHaveLength(0);
  });

  it("erro da API (EXCHANGE_AMOUNT_TOO_SMALL) vira a mesma mensagem", async () => {
    mockApi({
      convert: () => Promise.reject(new ApiError(400, "valor pequeno", "EXCHANGE_AMOUNT_TOO_SMALL")),
    });
    await renderExchange();
    typeAmount("1000");
    clickConvert();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("O valor mínimo por conversão é R$ 1,00", expect.anything()),
    );
  });
});
