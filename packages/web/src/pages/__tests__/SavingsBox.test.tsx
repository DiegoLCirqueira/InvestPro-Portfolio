import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SavingsBox } from "@/pages/SavingsBox";

const mocks = vi.hoisted(() => ({
  savings: { balance: 3_000, rate: 0.06, estimatedYield: 12.34 },
  deposit: vi.fn(),
  withdraw: vi.fn(),
}));

vi.mock("@/hooks/use-savings-box", () => ({
  useSavingsBox: () => ({
    data: mocks.savings,
    balance: mocks.savings.balance,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSavingsBoxDeposit: () => ({ mutate: mocks.deposit, isPending: false }),
  useSavingsBoxWithdraw: () => ({ mutate: mocks.withdraw, isPending: false }),
}));

vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolioPositions: () => ({ balance: 1_250, isLoading: false, error: null, refetch: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function renderPage() {
  render(
    <MemoryRouter>
      <SavingsBox />
    </MemoryRouter>,
  );
}

describe("Página Caixinha", () => {
  beforeEach(() => {
    mocks.savings = { balance: 3_000, rate: 0.06, estimatedYield: 12.34 };
  });

  it("mostra o saldo guardado, o rendimento da API e o saldo em conta disponível", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Caixinha" })).toBeInTheDocument();
    const main = screen.getByRole("region", { name: "Guardado na Caixinha" });
    expect(main).toHaveTextContent(/R\$\s?3\.000,00/);
    expect(main).toHaveTextContent(/100% do CDI \(6% ao ano na simulação\)/);
    expect(main).toHaveTextContent(/Rendimento estimado\s*R\$\s?12,34/);
    expect(main).toHaveTextContent(/Disponível para depositar:\s*R\$\s?1\.250,00/);
    expect(screen.getByRole("heading", { name: "Como funciona" })).toBeInTheDocument();
  });

  it("Depositar e Resgatar abrem o diálogo de sempre, e o foco volta ao botão ao fechar", async () => {
    renderPage();
    const main = screen.getByRole("region", { name: "Guardado na Caixinha" });

    fireEvent.click(within(main).getByRole("button", { name: "Depositar" }));
    expect(screen.getByRole("dialog", { name: "Depositar na Caixinha" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() =>
      expect(within(main).getByRole("button", { name: "Depositar" })).toHaveFocus(),
    );

    fireEvent.click(within(main).getByRole("button", { name: "Resgatar" }));
    expect(screen.getByRole("dialog", { name: "Resgatar da Caixinha" })).toBeInTheDocument();
  });

  it("vazia: convida ao primeiro depósito e não oferece Resgatar", () => {
    mocks.savings = { balance: 0, rate: 0.06, estimatedYield: 0 };
    renderPage();

    expect(screen.getByText("Sua Caixinha está vazia")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resgatar" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fazer o primeiro depósito" }));
    expect(screen.getByRole("dialog", { name: "Depositar na Caixinha" })).toBeInTheDocument();
  });
});
