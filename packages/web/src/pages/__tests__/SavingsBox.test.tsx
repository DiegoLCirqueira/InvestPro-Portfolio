import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SavingsBox } from "@/pages/SavingsBox";
import type { SavingsBoxTransaction } from "@/types/savings-box";

const mocks = vi.hoisted(() => ({
  savings: { balance: 3_000, rate: 0.06, estimatedYield: 12.34 },
  savingsState: { isLoading: false, error: null as Error | null },
  account: { free: 1_250, reserved: 0, isLoading: false, error: null as Error | null },
  refetchSavings: vi.fn(),
  refetchAccount: vi.fn(),
  deposit: vi.fn(),
  withdraw: vi.fn(),
  onDepositSuccess: undefined as (() => void) | undefined,
  // Extrato: vazio por padrão.
  transactions: {
    items: [] as SavingsBoxTransaction[],
    hasMore: false,
    isLoading: false,
    error: null as Error | null,
    isLoadingMore: false,
    loadMoreError: null as Error | null,
  },
  refetchTransactions: vi.fn(),
  loadMore: vi.fn(),
}));

vi.mock("@/hooks/use-savings-box", () => ({
  useSavingsBox: () => ({
    data: mocks.savings,
    balance: mocks.savings.balance,
    isLoading: mocks.savingsState.isLoading,
    error: mocks.savingsState.error,
    refetch: mocks.refetchSavings,
  }),
  useSavingsBoxDeposit: (options: { onSuccess?: () => void }) => {
    mocks.onDepositSuccess = options.onSuccess;
    return { mutate: mocks.deposit, isPending: false };
  },
  useSavingsBoxWithdraw: () => ({ mutate: mocks.withdraw, isPending: false }),
  useSavingsBoxTransactions: () => ({
    ...mocks.transactions,
    refetch: mocks.refetchTransactions,
    loadMore: mocks.loadMore,
  }),
}));

// Saldo em conta LIVRE (o reservado em ordens abertas já descontado).
vi.mock("@/hooks/use-free-balance", () => ({
  useFreeBalance: () => ({ ...mocks.account, refetch: mocks.refetchAccount }),
}));

// "Adicionar saldo grátis" (diálogo do Painel): o depósito deixa R$ 100 em conta.
vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolioPositions: () => ({ balance: 0, isLoading: false, refetch: vi.fn() }),
  useTopUpLimit: () => ({
    data: { limit: 3_000_000, used: 0, remaining: 3_000_000 },
    refetch: vi.fn(),
  }),
  useTopUpPortfolio: (options: { onSuccess?: () => void } = {}) => ({
    mutate: async () => {
      mocks.account = { ...mocks.account, free: 100 };
      options.onSuccess?.();
      return { balance: 100 };
    },
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

function renderPage() {
  render(
    <MemoryRouter>
      <SavingsBox />
    </MemoryRouter>,
  );
}

const summary = () => screen.getByRole("region", { name: "Guardado na Caixinha" });
const simulator = () => screen.getByRole("region", { name: "Quanto rende" });

describe("Página Caixinha", () => {
  beforeEach(() => {
    mocks.savings = { balance: 3_000, rate: 0.06, estimatedYield: 12.34 };
    mocks.savingsState = { isLoading: false, error: null };
    mocks.account = { free: 1_250, reserved: 0, isLoading: false, error: null };
    mocks.deposit.mockReset();
    mocks.refetchSavings.mockReset();
    mocks.refetchAccount.mockReset();
    mocks.refetchTransactions.mockReset();
    mocks.loadMore.mockReset();
    mocks.transactions = {
      items: [],
      hasMore: false,
      isLoading: false,
      error: null,
      isLoadingMore: false,
      loadMoreError: null,
    };
  });

  describe("Movimentações", () => {
    const movements = () => screen.getByRole("region", { name: "Movimentações" });
    const tx = (overrides: Partial<SavingsBoxTransaction>): SavingsBoxTransaction => ({
      id: "t1",
      type: "DEPOSIT",
      amount: 500,
      balanceAfter: 3_000,
      createdAt: "2026-10-04T13:05:00.000Z",
      orderId: null,
      ...overrides,
    });

    it("vazio com a Caixinha vazia: explica onde os movimentos vão aparecer", () => {
      mocks.savings = { balance: 0, rate: 0.06, estimatedYield: 0 };
      renderPage();

      expect(movements()).toHaveTextContent("Seus depósitos e resgates aparecem aqui.");
      expect(within(movements()).queryByRole("button", { name: "Ver mais" })).not.toBeInTheDocument();
    });

    it("vazio com dinheiro guardado (Caixinha antiga): diz desde quando o extrato registra", () => {
      renderPage();

      expect(movements()).toHaveTextContent(
        "As movimentações são registradas a partir de 04/10/2026.",
      );
      expect(movements()).not.toHaveTextContent("Seus depósitos e resgates aparecem aqui.");
    });

    it("lista depósito, resgate e uso numa compra com sinal, data e saldo depois", () => {
      mocks.transactions.items = [
        tx({ id: "a" }),
        tx({ id: "b", type: "WITHDRAW", amount: 200, balanceAfter: 2_500 }),
        tx({ id: "c", type: "ORDER_FUNDING", amount: 300, balanceAfter: 2_700, orderId: "o1" }),
      ];
      renderPage();

      const rows = within(movements()).getAllByRole("listitem");
      expect(rows).toHaveLength(3);
      expect(rows[0]).toHaveTextContent(/Depósito.*\+R\$\s?500,00.*Saldo: R\$\s?3\.000,00/);
      expect(rows[0]).toHaveTextContent(/\d{2}\/\d{2}\/2026, \d{2}:\d{2}/);
      expect(rows[1]).toHaveTextContent(/Resgate.*−R\$\s?200,00/);
      expect(rows[2]).toHaveTextContent(/Usado numa compra.*−R\$\s?300,00/);
    });

    it("com mais páginas, Ver mais pede a próxima", () => {
      mocks.transactions.items = [tx({})];
      mocks.transactions.hasMore = true;
      renderPage();

      fireEvent.click(within(movements()).getByRole("button", { name: "Ver mais" }));
      expect(mocks.loadMore).toHaveBeenCalled();
    });

    it("falha no Ver mais avisa sem apagar a lista", () => {
      mocks.transactions.items = [tx({})];
      mocks.transactions.hasMore = true;
      mocks.transactions.loadMoreError = new Error("rede");
      renderPage();

      expect(within(movements()).getByRole("alert")).toHaveTextContent(
        "Não foi possível carregar mais movimentações.",
      );
      expect(within(movements()).getAllByRole("listitem")).toHaveLength(1);
    });

    it("erro só no extrato: o resto da página segue e Tentar novamente recarrega", () => {
      mocks.transactions.error = new Error("Falha");
      renderPage();

      expect(summary()).toBeInTheDocument();
      expect(movements()).toHaveTextContent("Não foi possível carregar as movimentações");
      fireEvent.click(within(movements()).getByRole("button", { name: "Tentar novamente" }));
      expect(mocks.refetchTransactions).toHaveBeenCalled();
    });

    it("carregando: o bloco fica ocupado (aria-busy)", () => {
      mocks.transactions.isLoading = true;
      renderPage();

      expect(movements()).toHaveAttribute("aria-busy", "true");
    });

    it("depois de depositar, o extrato recarrega do topo", async () => {
      mocks.deposit.mockImplementation(async () => mocks.onDepositSuccess?.());
      renderPage();

      fireEvent.click(within(summary()).getByRole("button", { name: "Depositar" }));
      fireEvent.change(screen.getByLabelText("Valor a depositar"), { target: { value: "10000" } });
      fireEvent.click(screen.getByRole("button", { name: /Depositar R\$\s?100,00/ }));

      await waitFor(() => expect(mocks.refetchTransactions).toHaveBeenCalled());
    });
  });

  describe("com saldo", () => {
    it("Resumo: guardado, taxa, quanto do dinheiro livre rende e quanto rende por mês", () => {
      renderPage();

      expect(screen.getByRole("heading", { level: 1, name: "Caixinha" })).toBeInTheDocument();
      const main = summary();
      expect(main).toHaveTextContent(/R\$\s?3\.000,00/);
      expect(main).toHaveTextContent("100% do CDI · 6% ao ano na simulação");
      // 3.000 de 4.250 livres = 71%.
      expect(main).toHaveTextContent("71% rendendo");
      expect(
        within(main).getByRole("img", { name: "71% do seu dinheiro livre está na Caixinha" }),
      ).toBeInTheDocument();
      expect(main).toHaveTextContent(/Parado no Saldo em conta\s*R\$\s?1\.250,00/);
      expect(main).toHaveTextContent(/Rende cerca de R\$\s?15,00 por mês \(simulação\)\./);
    });

    it("quase tudo guardado não vira 100%: ainda há dinheiro parado em conta", () => {
      // 10.980,42 de 10.995,92 = 99,86%.
      mocks.savings = { balance: 10_980.42, rate: 0.06, estimatedYield: 0 };
      mocks.account = { free: 15.5, reserved: 0, isLoading: false, error: null };
      renderPage();

      expect(summary()).toHaveTextContent("mais de 99% rendendo");
      expect(summary()).not.toHaveTextContent("100% rendendo");
      expect(
        within(summary()).getByRole("img", {
          name: "mais de 99% do seu dinheiro livre está na Caixinha",
        }),
      ).toBeInTheDocument();
    });

    it("não mostra mais o Rendimento estimado (retroativo, errado)", () => {
      renderPage();

      expect(screen.queryByText(/Rendimento estimado/)).not.toBeInTheDocument();
      expect(screen.queryByText(/12,34/)).not.toBeInTheDocument();
    });

    it("com reserva em ordens abertas, explica o saldo livre menor", () => {
      mocks.account = { free: 1_250, reserved: 400, isLoading: false, error: null };
      renderPage();

      expect(summary()).toHaveTextContent(/Reservado em ordens abertas:\s*R\$\s?400,00/);
    });

    it("Depositar e Resgatar abrem o diálogo, e o foco volta ao botão ao fechar", async () => {
      renderPage();
      const main = summary();

      fireEvent.click(within(main).getByRole("button", { name: "Depositar" }));
      expect(screen.getByRole("dialog", { name: "Depositar na Caixinha" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      await waitFor(() =>
        expect(within(main).getByRole("button", { name: "Depositar" })).toHaveFocus(),
      );

      fireEvent.click(within(main).getByRole("button", { name: "Resgatar" }));
      expect(screen.getByRole("dialog", { name: "Resgatar da Caixinha" })).toBeInTheDocument();
    });

    it("Como funciona: 3 passos e o atalho para Ordens", () => {
      renderPage();

      const how = screen.getByRole("region", { name: "Como funciona" });
      expect(within(how).getAllByRole("listitem")).toHaveLength(3);
      expect(within(how).getByRole("link", { name: "Ir para Ordens" })).toHaveAttribute(
        "href",
        "/orders",
      );
    });

    it("no computador, Como funciona estica até a altura do Quanto rende (celular: natural)", () => {
      renderPage();

      const how = screen.getByRole("region", { name: "Como funciona" });
      expect(how).toHaveClass("nav:self-stretch");
      expect(simulator()).toHaveClass("nav:self-stretch");
      // A sobra vai para entre os passos, não para um vão só antes da dica.
      expect(within(how).getByRole("list")).toHaveClass("nav:flex-1", "nav:justify-between");
      expect(how.className).not.toMatch(/(^|\s)self-stretch/);
    });
  });

  describe("simulador Quanto rende", () => {
    it("começa no valor guardado, em 12 meses, e recalcula ao trocar o período", () => {
      renderPage();
      const sim = simulator();

      expect(within(sim).getByRole("button", { name: "12 meses" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      // 3.000 × 6% × 12/12 = 180.
      expect(sim).toHaveTextContent(/Na Caixinha\s*R\$\s?3\.180,00 \(\+R\$\s?180,00\)/);
      expect(sim).toHaveTextContent(/Parado no Saldo em conta\s*R\$\s?3\.000,00 \(\+R\$\s?0,00\)/);

      fireEvent.click(within(sim).getByRole("button", { name: "1 mês" }));
      expect(sim).toHaveTextContent(/Na Caixinha\s*R\$\s?3\.015,00 \(\+R\$\s?15,00\)/);
      expect(sim).toHaveTextContent("Simulação com juros simples de 6% ao ano");
    });

    it("valor acima do saldo em conta desabilita o depósito com o motivo", () => {
      renderPage();
      const sim = simulator();

      // R$ 3.000 simulados, R$ 1.250 em conta.
      const button = within(sim).getByRole("button", { name: /Depositar R\$\s?3\.000,00/ });
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription(/Você tem R\$\s?1\.250,00 em conta\./);
    });

    it("Depositar abre o diálogo com o valor simulado preenchido", () => {
      renderPage();
      const sim = simulator();

      fireEvent.change(within(sim).getByLabelText("Valor a simular"), {
        target: { value: "50000" },
      });
      fireEvent.click(within(sim).getByRole("button", { name: /Depositar R\$\s?500,00/ }));

      const dialog = screen.getByRole("dialog", { name: "Depositar na Caixinha" });
      expect(
        (within(dialog).getByLabelText("Valor a depositar") as HTMLInputElement).value,
      ).toMatch(/R\$\s?500,00/);
    });
  });

  describe("vazia", () => {
    beforeEach(() => {
      mocks.savings = { balance: 0, rate: 0.06, estimatedYield: 0 };
    });

    it("convida ao primeiro depósito, sem Resgatar, e o simulador continua visível", () => {
      renderPage();

      expect(screen.getByText("Sua Caixinha está vazia")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Resgatar" })).not.toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      // Sem guardado, o simulador sugere o que dá para guardar (até R$ 1.000).
      expect(simulator()).toHaveTextContent(/R\$\s?1\.060,00 \(\+R\$\s?60,00\)/);

      fireEvent.click(screen.getByRole("button", { name: "Fazer o primeiro depósito" }));
      expect(screen.getByRole("dialog", { name: "Depositar na Caixinha" })).toBeInTheDocument();
    });

    it("depois do primeiro depósito pelo estado vazio, o foco vai para o novo Depositar", async () => {
      // O depósito enche a Caixinha (como o refetch traria) e conclui pelo onSuccess do hook.
      mocks.deposit.mockImplementation(async () => {
        mocks.savings = { balance: 100, rate: 0.06, estimatedYield: 0 };
        mocks.onDepositSuccess?.();
      });
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Fazer o primeiro depósito" }));
      fireEvent.change(screen.getByLabelText("Valor a depositar"), { target: { value: "10000" } });
      fireEvent.click(screen.getByRole("button", { name: /Depositar R\$\s?100,00/ }));

      await waitFor(() =>
        expect(within(summary()).getByRole("button", { name: "Depositar" })).toHaveFocus(),
      );
      expect(mocks.refetchSavings).toHaveBeenCalled();
      expect(mocks.refetchAccount).toHaveBeenCalled();
    });

    it("sem saldo em conta: o primeiro passo é adicionar saldo grátis", () => {
      mocks.account = { free: 0, reserved: 0, isLoading: false, error: null };
      renderPage();

      expect(summary()).toHaveTextContent("Adicione saldo grátis e depois guarde uma parte aqui.");
      const button = within(simulator()).getByRole("button", { name: /Depositar R\$\s?1\.000,00/ });
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription(/Você tem R\$\s?0,00 em conta\./);

      fireEvent.click(screen.getByRole("button", { name: "Adicionar saldo grátis" }));
      expect(screen.getByRole("dialog", { name: "Adicionar saldo grátis" })).toBeInTheDocument();
    });

    it("depois do saldo grátis, o foco fica no botão que passa a ser o primeiro depósito", async () => {
      mocks.account = { free: 0, reserved: 0, isLoading: false, error: null };
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Adicionar saldo grátis" }));
      fireEvent.change(screen.getByLabelText("Valor a adicionar"), { target: { value: "10000" } });
      fireEvent.click(screen.getByRole("button", { name: /Adicionar R\$\s?100,00/ }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Fazer o primeiro depósito" })).toHaveFocus(),
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("carregando: só o esqueleto, com o título da página", () => {
    mocks.savingsState = { isLoading: true, error: null };
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Caixinha" })).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("erro: mensagem e Tentar novamente recarrega os dois saldos", () => {
    mocks.savingsState = { isLoading: false, error: new Error("Falha de rede") };
    renderPage();

    expect(screen.getByText("Não foi possível carregar a Caixinha")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mocks.refetchSavings).toHaveBeenCalled();
    expect(mocks.refetchAccount).toHaveBeenCalled();
  });
});
