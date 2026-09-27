import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Transfers } from "@/pages/Transfers";
import { ApiError } from "@/services/api";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/services/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api")>("@/services/api");
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
        <Route
          path="/transfers"
          element={
            <TooltipProvider>
              <Transfers />
            </TooltipProvider>
          }
        />
        <Route path="/profile" element={<p>Tela de perfil</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
  await screen.findByLabelText("Valor da transferência");
}

describe("Transferências: CPF obrigatório", () => {
  beforeEach(() => {
    apiMock.get
      .mockReset()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    apiMock.post
      .mockReset()
      .mockRejectedValue(
        new ApiError(400, "CPF é obrigatório", "CPF_REQUIRED"),
      );
    vi.mocked(toast.error).mockClear();
  });

  it("o 'Completar CPF' do aviso leva ao campo de CPF no Perfil (#cpf)", async () => {
    await renderTransfers();
    fireEvent.change(screen.getByLabelText("Valor da transferência"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText("Chave PIX"), {
      target: { value: VALID_PIX_KEY },
    });

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    const [message, options] = vi.mocked(toast.error).mock.calls[0] as [
      string,
      { action: { label: string; onClick: () => void } },
    ];
    expect(message).toMatch(/completar seu CPF/);
    expect(options.action.label).toBe("Completar CPF");

    act(() => options.action.onClick());

    expect(screen.getByTestId("location")).toHaveTextContent("/profile#cpf");
    expect(screen.getByText("Tela de perfil")).toBeInTheDocument();
  });
});

describe("Transferências: validação do formulário", () => {
  beforeEach(() => {
    apiMock.get
      .mockReset()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
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
    fireEvent.change(screen.getByLabelText("Valor da transferência"), {
      target: { value: "1000" },
    });
  }

  it.each([
    ["sem chave", "", /Informe a chave PIX/],
    ["com chave inválida", "isso-nao-e-chave", /Chave PIX inválida/],
  ])("PIX %s não chega à API", async (_label, key, message) => {
    await renderTransfers();
    fillAmount();
    fireEvent.change(screen.getByLabelText("Chave PIX"), {
      target: { value: key },
    });

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(message)),
    );
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("PIX válido envia a chave e limpa o campo depois do sucesso", async () => {
    await renderTransfers();
    fillAmount();
    fireEvent.change(screen.getByLabelText("Chave PIX"), {
      target: { value: ` ${VALID_PIX_KEY} ` },
    });

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));

    await vi.waitFor(() => expect(apiMock.post).toHaveBeenCalled());
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({
      type: "PIX",
      pixKey: VALID_PIX_KEY,
    });
    await vi.waitFor(() =>
      expect(screen.getByLabelText("Chave PIX")).toHaveValue(""),
    );
  });

  it("TED com conta de destino envia banco, agência e conta", async () => {
    await renderTransfers();
    fireEvent.click(screen.getByRole("button", { name: "TED" }));
    fillAmount();
    fireEvent.change(screen.getByLabelText("Banco"), {
      target: { value: "001" },
    });
    fireEvent.change(screen.getByLabelText("Agência"), {
      target: { value: "1234" },
    });
    fireEvent.change(screen.getByLabelText("Número da conta"), {
      target: { value: "56789-0" },
    });

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
    fireEvent.change(screen.getByLabelText("Banco"), {
      target: { value: "001" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/banco, agência e número da conta/),
      ),
    );
    expect(apiMock.post).not.toHaveBeenCalled();
  });
});

describe("Transferências: chave PIX só com números (reconhece e formata)", () => {
  beforeEach(() => {
    apiMock.get
      .mockReset()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    apiMock.post.mockReset().mockResolvedValue({
      id: "t-1",
      status: "COMPLETED",
      type: "PIX",
      amount: 10,
      createdAt: new Date().toISOString(),
    });
    vi.mocked(toast.error).mockClear();
  });

  async function typeKey(value: string) {
    await renderTransfers();
    fireEvent.change(screen.getByLabelText("Valor da transferência"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText("Chave PIX"), { target: { value } });
  }

  it("celular: 82991234567 vira 82 99123-4567 e é enviado como +55 / PHONE", async () => {
    await typeKey("82991234567");

    expect(screen.getByLabelText("Chave PIX")).toHaveValue("82 99123-4567");
    expect(screen.getByText("Celular")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));
    await vi.waitFor(() => expect(apiMock.post).toHaveBeenCalled());
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({
      pixKey: "+5582991234567",
      pixKeyType: "PHONE",
    });
  });

  it("CPF: 52998224725 vira 529.982.247-25 e é enviado só com dígitos / CPF", async () => {
    await typeKey("52998224725");

    expect(screen.getByLabelText("Chave PIX")).toHaveValue("529.982.247-25");

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));
    await vi.waitFor(() => expect(apiMock.post).toHaveBeenCalled());
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({
      pixKey: "52998224725",
      pixKeyType: "CPF",
    });
  });

  it("CNPJ: 11222333000181 vira 11.222.333/0001-81", async () => {
    await typeKey("11222333000181");
    expect(screen.getByLabelText("Chave PIX")).toHaveValue(
      "11.222.333/0001-81",
    );
  });

  it("ambígua (CPF e celular): pergunta o tipo, bloqueia o envio até escolher", async () => {
    await typeKey("82991234539");

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/CPF ou um celular/),
      ),
    );
    expect(apiMock.post).not.toHaveBeenCalled();

    const chooser = screen.getByRole("group", { name: "Tipo da chave PIX" });
    fireEvent.click(within(chooser).getByRole("button", { name: "Celular" }));
    expect(screen.getByLabelText("Chave PIX")).toHaveValue("82 99123-4539");

    fireEvent.click(screen.getByRole("button", { name: "Transferir" }));
    await vi.waitFor(() => expect(apiMock.post).toHaveBeenCalled());
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({
      pixKey: "+5582991234539",
      pixKeyType: "PHONE",
    });
  });
});

describe("Transferências: ajuda do TED/DOC", () => {
  beforeEach(() => {
    apiMock.get
      .mockReset()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
  });

  it("tocar no ícone abre a explicação e tocar de novo fecha (funciona sem hover, no celular)", async () => {
    await renderTransfers();
    const helpButton = screen.getByRole("button", {
      name: "Saiba mais sobre TED",
    });

    // Sequência real do navegador (pressionar e depois clicar): só o click, sem pointerdown,
    // escondia que o Tooltip do Radix se fechava no pointerdown do próprio gatilho.
    const tap = () => {
      fireEvent.pointerDown(helpButton, { button: 0, pointerType: "touch" });
      fireEvent.mouseDown(helpButton, { button: 0 });
      fireEvent.pointerUp(helpButton, { button: 0, pointerType: "touch" });
      fireEvent.mouseUp(helpButton, { button: 0 });
      fireEvent.click(helpButton);
    };

    tap();
    expect(await screen.findByText(/bancos diferentes/)).toBeInTheDocument();

    tap();
    await vi.waitFor(() =>
      expect(screen.queryByText(/bancos diferentes/)).not.toBeInTheDocument(),
    );
  });
});
