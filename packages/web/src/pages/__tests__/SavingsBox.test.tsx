import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SavingsBox } from "@/pages/SavingsBox";

const mocks = vi.hoisted(() => ({
  savings: { balance: 3_000, rate: 0.06, estimatedYield: 12.34 },
  savingsState: { isLoading: false, error: null as Error | null },
  account: { free: 1_250, reserved: 0, isLoading: false, error: null as Error | null },
  refetchSavings: vi.fn(),
  refetchAccount: vi.fn(),
  deposit: vi.fn(),
  withdraw: vi.fn(),
  onDepositSuccess: undefined as (() => void) | undefined,
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
}));

// Saldo em conta LIVRE (o reservado em ordens abertas já descontado).
vi.mock("@/hooks/use-free-balance", () => ({
  useFreeBalance: () => ({ ...mocks.account, refetch: mocks.refetchAccount }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

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
