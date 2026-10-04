import { useRef, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SavingsBoxDialog, type SavingsBoxMode } from "@/components/savings-box/SavingsBoxDialog";

const mocks = vi.hoisted(() => ({
  deposit: vi.fn(),
  withdraw: vi.fn(),
  callbacks: {} as Record<string, { onSuccess?: () => void }>,
}));

// O mutate chama o onSuccess do hook, como o useMutation real.
vi.mock("@/hooks/use-savings-box", () => ({
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

// Abre o diálogo como a página da Caixinha: guarda o botão que abriu para o foco voltar.
function Harness({ accountBalance, onSuccess }: { accountBalance: number; onSuccess: () => void }) {
  const [mode, setMode] = useState<SavingsBoxMode | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  return (
    <section aria-label="Ações">
      <button
        type="button"
        onClick={(event) => {
          openerRef.current = event.currentTarget;
          setMode("DEPOSIT");
        }}
      >
        Depositar
      </button>
      <button
        type="button"
        onClick={(event) => {
          openerRef.current = event.currentTarget;
          setMode("WITHDRAW");
        }}
      >
        Resgatar
      </button>
      <SavingsBoxDialog
        mode={mode}
        onClose={() => setMode(null)}
        returnFocusTo={openerRef}
        accountBalance={accountBalance}
        savingsBalance={3_000}
        onSuccess={onSuccess}
      />
    </section>
  );
}

function renderDialog(accountBalance = 1_250) {
  const onSuccess = vi.fn();
  render(<Harness accountBalance={accountBalance} onSuccess={onSuccess} />);
  return { onSuccess, actions: screen.getByRole("region", { name: "Ações" }) };
}

describe("SavingsBoxDialog (Depositar / Resgatar)", () => {
  beforeEach(() => {
    mocks.deposit.mockReset().mockImplementation(async () => mocks.callbacks.deposit.onSuccess?.());
    mocks.withdraw.mockReset().mockImplementation(async () => mocks.callbacks.withdraw.onSuccess?.());
  });

  it("Depositar mostra os dois saldos e envia o valor digitado", async () => {
    const { onSuccess } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Depositar" }));
    const dialog = screen.getByRole("dialog", { name: "Depositar na Caixinha" });
    expect(within(dialog).getByText(/R\$\s?1\.250,00/)).toBeInTheDocument();
    expect(within(dialog).getByText(/R\$\s?3\.000,00/)).toBeInTheDocument();

    const field = within(dialog).getByLabelText("Valor a depositar");
    expect(field).toHaveFocus();
    fireEvent.change(field, { target: { value: "50000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Depositar R\$\s?500,00/ }));

    await waitFor(() => expect(mocks.deposit).toHaveBeenCalledWith(500));
    expect(onSuccess).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("Resgatar abre o mesmo diálogo, invertido", async () => {
    renderDialog();

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
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Depositar" }));
    const field = screen.getByLabelText("Valor a depositar");
    fireEvent.change(field, { target: { value: "200000" } });

    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(
      /O valor passa do que você tem em conta: faltam R\$\s?750,00\. Você tem R\$\s?1\.250,00 em conta\./,
    );
    const submit = screen.getByRole("button", { name: /Depositar R\$\s?2\.000,00/ });
    expect(submit).toBeDisabled();
    // O botão desabilitado aponta para o motivo.
    expect(submit).toHaveAccessibleDescription(/faltam R\$\s?750,00/);
  });

  it("ao fechar, o foco volta ao botão que abriu", async () => {
    const { actions } = renderDialog();

    // Depósito concluído (o diálogo fecha sozinho).
    fireEvent.click(within(actions).getByRole("button", { name: "Depositar" }));
    fireEvent.change(screen.getByLabelText("Valor a depositar"), { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("button", { name: /Depositar R\$\s?100,00/ }));
    await waitFor(() =>
      expect(within(actions).getByRole("button", { name: "Depositar" })).toHaveFocus(),
    );

    // Cancelar no Resgatar.
    fireEvent.click(within(actions).getByRole("button", { name: "Resgatar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() =>
      expect(within(actions).getByRole("button", { name: "Resgatar" })).toHaveFocus(),
    );
  });

  it("sem saldo em conta, o depósito vem desabilitado já explicando o porquê", () => {
    renderDialog(0);

    fireEvent.click(screen.getByRole("button", { name: "Depositar" }));

    const submit = within(screen.getByRole("dialog")).getByRole("button", { name: "Depositar" });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAccessibleDescription("Você não tem saldo em conta para depositar.");
  });
});
