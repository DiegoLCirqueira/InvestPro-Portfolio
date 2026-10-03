import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SavingsBoxRow } from "@/components/savings-box/SavingsBoxRow";

const mocks = vi.hoisted(() => ({
  deposit: vi.fn(),
  withdraw: vi.fn(),
  refetch: vi.fn(),
  callbacks: {} as Record<string, { onSuccess?: () => void }>,
}));

// O mutate chama o onSuccess do hook, como o useMutation real.
vi.mock("@/hooks/use-savings-box", () => ({
  useSavingsBox: () => ({ balance: 3_000, refetch: mocks.refetch }),
  useSavingsBoxDeposit: (options: { onSuccess?: () => void }) => {
    mocks.callbacks.deposit = options;
    return { mutate: mocks.deposit, isPending: false };
  },
  useSavingsBoxWithdraw: (options: { onSuccess?: () => void }) => {
    mocks.callbacks.withdraw = options;
    return { mutate: mocks.withdraw, isPending: false };
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function renderCard(url = "/") {
  const onBalanceChange = vi.fn();
  render(
    <MemoryRouter initialEntries={[url]}>
      <SavingsBoxRow accountBalance={1_250} onBalanceChange={onBalanceChange} />
    </MemoryRouter>,
  );
  return { onBalanceChange };
}

describe("SavingsBoxRow (Caixinha no topo de Seus Ativos)", () => {
  beforeEach(() => {
    mocks.deposit.mockReset().mockImplementation(async () => mocks.callbacks.deposit.onSuccess?.());
    mocks.withdraw.mockReset().mockImplementation(async () => mocks.callbacks.withdraw.onSuccess?.());
    mocks.refetch.mockReset();
  });

  it("linha com nome, rendimento, valor e as duas ações (sem formulário fixo)", () => {
    renderCard();

    const row = screen.getByRole("region", { name: "Caixinha" });
    expect(row).toHaveAttribute("id", "caixinha");
    expect(within(row).getByText("Rende 100% do CDI")).toBeInTheDocument();
    expect(within(row).getByText(/R\$\s?3\.000,00/)).toBeInTheDocument();
    // Ações compactas no texto, mas com alvo de 44px.
    for (const name of ["Depositar", "Resgatar"])
      expect(within(row).getByRole("button", { name })).toHaveClass("min-h-11");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("aberta pelo link /#caixinha, rola até a linha", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderCard("/#caixinha");

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("Depositar abre o diálogo com os dois saldos e envia o valor digitado", async () => {
    const { onBalanceChange } = renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Depositar" }));
    const dialog = screen.getByRole("dialog", { name: "Depositar na Caixinha" });
    expect(within(dialog).getByText(/R\$\s?1\.250,00/)).toBeInTheDocument();
    expect(within(dialog).getByText(/R\$\s?3\.000,00/)).toBeInTheDocument();

    const field = within(dialog).getByLabelText("Valor a depositar");
    expect(field).toHaveFocus();
    fireEvent.change(field, { target: { value: "50000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Depositar R\$\s?500,00/ }));

    await waitFor(() => expect(mocks.deposit).toHaveBeenCalledWith(500));
    expect(mocks.refetch).toHaveBeenCalled();
    expect(onBalanceChange).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("Resgatar abre o mesmo diálogo, invertido", async () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Resgatar" }));
    const dialog = screen.getByRole("dialog", { name: "Resgatar da Caixinha" });
    expect(within(dialog).getByText("Volta para o Saldo em conta.")).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Valor a resgatar"), {
      target: { value: "10000" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /Resgatar R\$\s?100,00/ }));

    await waitFor(() => expect(mocks.withdraw).toHaveBeenCalledWith(100));
    expect(mocks.deposit).not.toHaveBeenCalled();
  });

  it("valor acima do disponível avisa ali mesmo e não deixa enviar", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Depositar" }));
    const field = screen.getByLabelText("Valor a depositar");
    fireEvent.change(field, { target: { value: "200000" } });

    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/Você tem R\$\s?1\.250,00 em conta\./);
    expect(screen.getByRole("button", { name: /Depositar R\$\s?2\.000,00/ })).toBeDisabled();
  });
});
