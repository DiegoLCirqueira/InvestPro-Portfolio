import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SavingsBoxCard } from "@/components/savings-box/SavingsBoxCard";

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

function renderCard() {
  const onBalanceChange = vi.fn();
  render(<SavingsBoxCard accountBalance={1_250} onBalanceChange={onBalanceChange} />);
  return { onBalanceChange };
}

describe("SavingsBoxCard (Caixinha no Painel)", () => {
  beforeEach(() => {
    mocks.deposit.mockReset().mockImplementation(async () => mocks.callbacks.deposit.onSuccess?.());
    mocks.withdraw.mockReset().mockImplementation(async () => mocks.callbacks.withdraw.onSuccess?.());
    mocks.refetch.mockReset();
  });

  it("mostra o valor guardado, o rendimento e as duas ações (sem formulário fixo)", () => {
    renderCard();

    const card = screen.getByRole("region", { name: "Caixinha" });
    expect(card).toHaveAttribute("id", "caixinha");
    expect(within(card).getByRole("heading", { name: /R\$\s?3\.000,00/ })).toBeInTheDocument();
    expect(within(card).getByText("100% do CDI")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Depositar" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Resgatar" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
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
