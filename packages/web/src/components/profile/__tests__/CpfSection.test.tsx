import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { CpfSection } from "@/components/profile/CpfSection";
import { ApiError } from "@/services/api";
import { useAuthStore } from "@/stores/auth";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const VALID_CPF = "529.982.247-25";
const VALID_DIGITS = "52998224725";
const PASSWORD = "Senha#Atual1";
const PROFILE_WITH_CPF = { id: "1", email: "a@b.c", fullName: "Ana", phone: null, cpf: VALID_DIGITS, role: "USER", createdAt: "" };

const cpfInput = () => screen.getByLabelText("CPF") as HTMLInputElement;
const passwordInput = () => screen.getByLabelText("Senha atual") as HTMLInputElement;
const typeCpf = (value: string) => fireEvent.change(cpfInput(), { target: { value } });
const typePassword = (value: string) => fireEvent.change(passwordInput(), { target: { value } });
const saveButton = () => screen.queryByRole("button", { name: "Salvar CPF" });
const clickSave = () => fireEvent.click(saveButton() as HTMLElement);

function fillAndSave(cpf = VALID_CPF, password = PASSWORD) {
  typeCpf(cpf);
  typePassword(password);
  clickSave();
}

function renderSection(props: Partial<React.ComponentProps<typeof CpfSection>> = {}) {
  const onAlreadySet = vi.fn();
  render(<CpfSection savedCpf={null} onAlreadySet={onAlreadySet} shouldFocus={false} {...props} />);
  return { onAlreadySet };
}

describe("CpfSection", () => {
  beforeEach(() => {
    apiMock.patch.mockReset();
    vi.mocked(toast.success).mockClear();
  });

  it("sem CPF: campo editável com máscara e aviso de que não poderá ser alterado depois", () => {
    renderSection();

    expect(cpfInput()).not.toBeDisabled();
    expect(cpfInput()).toHaveAttribute("placeholder", "000.000.000-00");
    expect(screen.getByText(/não poderá ser alterado/)).toBeInTheDocument();

    typeCpf("52998224725");
    expect(cpfInput().value).toBe(VALID_CPF);
    typeCpf("529abc.982");
    expect(cpfInput().value).toBe("529.982");
  });

  it("o campo 'Senha atual' é de senha, com autocomplete current-password", () => {
    renderSection();

    expect(passwordInput()).toHaveAttribute("type", "password");
    expect(passwordInput()).toHaveAttribute("autocomplete", "current-password");
  });

  it("CPF inválido é barrado no cliente, com mensagem, sem chamar a API", () => {
    renderSection();

    fillAndSave("529.982.247-26");

    expect(screen.getByRole("alert")).toHaveTextContent("CPF inválido. Confira os números.");
    expect(cpfInput()).toHaveAttribute("aria-invalid", "true");
    expect(apiMock.patch).not.toHaveBeenCalled();

    typeCpf("529.982.247-2");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("sem a senha atual não envia e pede a senha", () => {
    renderSection();
    typeCpf(VALID_CPF);

    clickSave();

    expect(screen.getByRole("alert")).toHaveTextContent("Informe sua senha atual");
    expect(passwordInput()).toHaveAttribute("aria-invalid", "true");
    expect(apiMock.patch).not.toHaveBeenCalled();
  });

  it("salvar envia só os dígitos + a senha atual e depois vira somente leitura (sem senha na tela)", async () => {
    apiMock.patch.mockResolvedValue(PROFILE_WITH_CPF);
    renderSection();

    fillAndSave();

    await screen.findByText("CPF cadastrado; não pode ser alterado.");
    expect(apiMock.patch).toHaveBeenCalledWith("/users/me", { cpf: VALID_DIGITS, currentPassword: PASSWORD });
    expect(cpfInput()).toBeDisabled();
    expect(cpfInput().value).toBe(VALID_CPF);
    expect(saveButton()).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Senha atual")).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("CPF cadastrado com sucesso!");
  });

  it("três envios no mesmo tick fazem uma requisição só", () => {
    apiMock.patch.mockReturnValue(new Promise(() => {}));
    renderSection();
    typeCpf(VALID_CPF);
    typePassword(PASSWORD);

    const form = (saveButton() as HTMLElement).closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(apiMock.patch).toHaveBeenCalledTimes(1);
  });

  it("403 INVALID_CURRENT_PASSWORD: 'Senha atual incorreta.', limpa a senha, mantém o formulário e NÃO derruba a sessão", async () => {
    apiMock.patch.mockRejectedValue(new ApiError(403, "Senha atual incorreta", "INVALID_CURRENT_PASSWORD"));
    useAuthStore.setState({ token: "token", isAuthenticated: true });
    renderSection();

    fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("Senha atual incorreta.");
    expect(passwordInput()).toHaveAttribute("aria-invalid", "true");
    expect(passwordInput().value).toBe("");
    expect(cpfInput()).not.toBeDisabled();
    expect(cpfInput().value).toBe(VALID_CPF);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("429 (tentativas demais) avisa e diz quanto esperar quando o servidor informa", async () => {
    apiMock.patch.mockRejectedValue(new ApiError(429, "Muitas requisições", "RATE_LIMIT_EXCEEDED", 30));
    renderSection();

    fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas tentativas. Tente novamente em 30 s.");
    expect(passwordInput().value).toBe("");
  });

  it("409 CPF_IN_USE mostra mensagem genérica e mantém o campo editável", async () => {
    apiMock.patch.mockRejectedValue(new ApiError(409, "detalhe interno", "CPF_IN_USE"));
    renderSection();

    fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível usar este CPF.");
    expect(cpfInput()).not.toBeDisabled();
  });

  it("409 CPF_ALREADY_SET avisa e pede ao Perfil para reler os dados", async () => {
    apiMock.patch.mockRejectedValue(new ApiError(409, "já definido", "CPF_ALREADY_SET"));
    const { onAlreadySet } = renderSection();

    fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("já foi cadastrado e não pode ser alterado");
    expect(onAlreadySet).toHaveBeenCalled();
  });

  it("400 VALIDATION_ERROR do servidor vira a mesma mensagem de CPF inválido", async () => {
    apiMock.patch.mockRejectedValue(new ApiError(400, "Dados inválidos", "VALIDATION_ERROR"));
    renderSection();

    fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("CPF inválido. Confira os números.");
  });

  it("com CPF já cadastrado: somente leitura, formatado, com o aviso e sem senha nem botão", () => {
    renderSection({ savedCpf: VALID_DIGITS });

    expect(cpfInput()).toBeDisabled();
    expect(cpfInput().value).toBe(VALID_CPF);
    expect(screen.getByText("CPF cadastrado; não pode ser alterado.")).toBeInTheDocument();
    expect(saveButton()).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Senha atual")).not.toBeInTheDocument();
  });

  it("shouldFocus (vindo de 'Completar CPF') foca o campo editável", async () => {
    renderSection({ shouldFocus: true });

    await waitFor(() => expect(cpfInput()).toHaveFocus());
  });
});
