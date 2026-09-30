import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TopUpDialog } from "@/components/TopUpDialog";

const mocks = vi.hoisted(() => ({
  limit: { limit: 3_000_000, used: 1_250, remaining: 2_998_750 },
  mutate: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolioPositions: () => ({ balance: 1_250, isLoading: false, refetch: vi.fn() }),
  useTopUpLimit: () => ({ data: mocks.limit, refetch: vi.fn() }),
  useTopUpPortfolio: () => ({ mutate: mocks.mutate, isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: mocks.toastSuccess }),
}));

function renderDialog(props: Partial<Parameters<typeof TopUpDialog>[0]> = {}) {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();
  render(
    <MemoryRouter>
      <TopUpDialog open onOpenChange={onOpenChange} onSuccess={onSuccess} {...props} />
    </MemoryRouter>,
  );
  return { onOpenChange, onSuccess };
}

const valueField = () => screen.getByLabelText("Valor a adicionar") as HTMLInputElement;

describe("TopUpDialog (Adicionar saldo grátis)", () => {
  beforeEach(() => {
    mocks.limit = { limit: 3_000_000, used: 1_250, remaining: 2_998_750 };
    mocks.mutate.mockReset().mockResolvedValue({ balance: 6_250 });
    mocks.toastSuccess.mockReset();
  });

  it("mostra quanto ainda cabe no limite, com a barra do que já foi usado", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Adicionar saldo grátis" })).toBeInTheDocument();
    expect(screen.getByText("Você ainda pode adicionar")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?2\.998\.750,00/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Limite de saldo já usado" })).toHaveAttribute(
      "aria-valuenow",
      "1250",
    );
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
  });

  it("os atalhos preenchem o campo, ficam marcados e o botão repete o valor", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "R$ 5 mil" }));

    expect(valueField().value).toMatch(/R\$\s?5\.000,00/);
    expect(screen.getByRole("button", { name: "R$ 5 mil" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Adicionar R\$\s?5\.000,00/ })).toBeInTheDocument();
  });

  it("atalhos acima do que ainda cabe no limite ficam desabilitados", () => {
    mocks.limit = { limit: 3_000_000, used: 2_997_000, remaining: 3_000 };
    renderDialog();

    expect(screen.getByRole("button", { name: "R$ 1 mil" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "R$ 5 mil" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "R$ 50 mil" })).toBeDisabled();
  });

  it("ao concluir: fecha, avisa a tela e mostra o toast com o valor e o link para Ordens", async () => {
    const { onOpenChange, onSuccess } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "R$ 1 mil" }));

    fireEvent.click(screen.getByRole("button", { name: /Adicionar R\$\s?1\.000,00/ }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mocks.mutate).toHaveBeenCalledWith(1_000);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    const [title, options] = mocks.toastSuccess.mock.calls[0];
    expect(title).toMatch(/R\$\s?1\.000,00 adicionados/);
    render(<MemoryRouter>{options.description as ReactElement}</MemoryRouter>);
    expect(screen.getByRole("link", { name: "Fazer minha primeira ordem" })).toHaveAttribute(
      "href",
      "/orders",
    );
  });

  it("pré-preenchido pelo Saldo insuficiente: valor que falta no campo e a nota explicando", () => {
    renderDialog({ initialAmount: 419.4, note: "Valor que falta para a sua ordem de PETR4." });

    expect(valueField().value).toMatch(/R\$\s?419,40/);
    expect(valueField()).toHaveAccessibleDescription("Valor que falta para a sua ordem de PETR4.");
    expect(screen.getByRole("button", { name: /Adicionar R\$\s?419,40/ })).toBeInTheDocument();
  });

  it("Cancelar fecha sem adicionar", () => {
    const { onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
