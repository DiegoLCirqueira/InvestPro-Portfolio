import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Transfers } from "@/pages/Transfers";
import { ApiError } from "@/services/api";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const VALID_PIX_KEY = "destino@investpro.com";

function LocationProbe() {
  const { pathname, hash } = useLocation();
  return <p data-testid="location">{pathname + hash}</p>;
}

async function renderTransfers() {
  render(
    <MemoryRouter initialEntries={["/transfers"]}>
      <Routes>
        <Route path="/transfers" element={<TooltipProvider><Transfers /></TooltipProvider>} />
        <Route path="/profile" element={<p>Tela de perfil</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
  await screen.findByLabelText("Valor da transferência");
}

describe("Transferências: CPF obrigatório", () => {
  beforeEach(() => {
    apiMock.get.mockReset().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    apiMock.post.mockReset().mockRejectedValue(new ApiError(400, "CPF é obrigatório", "CPF_REQUIRED"));
    vi.mocked(toast.error).mockClear();
  });

  it("o 'Completar CPF' do aviso leva ao campo de CPF no Perfil (#cpf)", async () => {
    await renderTransfers();
    fireEvent.change(screen.getByLabelText("Valor da transferência"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Chave PIX"), { target: { value: VALID_PIX_KEY } });

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    const [message, options] = vi.mocked(toast.error).mock.calls[0] as [string, { action: { label: string; onClick: () => void } }];
    expect(message).toMatch(/completar seu CPF/);
    expect(options.action.label).toBe("Completar CPF");

    act(() => options.action.onClick());

    expect(screen.getByTestId("location")).toHaveTextContent("/profile#cpf");
    expect(screen.getByText("Tela de perfil")).toBeInTheDocument();
  });
});

describe("Transferências: validação do formulário", () => {
  beforeEach(() => {
    apiMock.get.mockReset().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    apiMock.post.mockReset().mockResolvedValue({
      id: "t-1",
      status: "COMPLETED",
      type: "PIX",
      amount: 10,
      createdAt: new Date().toISOString(),
    });
    vi.mocked(toast.error).mockClear();
  });

  function fillAmount() {
    fireEvent.change(screen.getByLabelText("Valor da transferência"), { target: { value: "1000" } });
  }

  it.each([
    ["sem chave", "", /Informe a chave PIX/],
    ["com chave inválida", "isso-nao-e-chave", /Chave PIX inválida/],
  ])("PIX %s não chega à API", async (_label, key, message) => {
    await renderTransfers();
    fillAmount();
    fireEvent.change(screen.getByLabelText("Chave PIX"), { target: { value: key } });

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(message)));
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("PIX válido envia a chave e limpa o campo depois do sucesso", async () => {
    await renderTransfers();
    fillAmount();
    fireEvent.change(screen.getByLabelText("Chave PIX"), { target: { value: ` ${VALID_PIX_KEY} ` } });

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));

    await vi.waitFor(() => expect(apiMock.post).toHaveBeenCalled());
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({ type: "PIX", pixKey: VALID_PIX_KEY });
    await vi.waitFor(() => expect(screen.getByLabelText("Chave PIX")).toHaveValue(""));
  });

  it("TED com conta de destino envia banco, agência e conta", async () => {
    await renderTransfers();
    fireEvent.click(screen.getByRole("button", { name: "TED" }));
    fillAmount();
    fireEvent.change(screen.getByLabelText("Banco"), { target: { value: "001" } });
    fireEvent.change(screen.getByLabelText("Agência"), { target: { value: "1234" } });
    fireEvent.change(screen.getByLabelText("Número da conta"), { target: { value: "56789-0" } });

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));

    await vi.waitFor(() => expect(apiMock.post).toHaveBeenCalled());
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({
      type: "TED",
      toAccount: { bank: "001", agency: "1234", account: "56789-0" },
    });
  });

  it("TED com conta de destino incompleta não chega à API", async () => {
    await renderTransfers();
    fireEvent.click(screen.getByRole("button", { name: "TED" }));
    fillAmount();
    fireEvent.change(screen.getByLabelText("Banco"), { target: { value: "001" } });

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/banco, agência e número da conta/)),
    );
    expect(apiMock.post).not.toHaveBeenCalled();
  });
});
