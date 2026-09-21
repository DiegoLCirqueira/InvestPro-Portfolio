import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UserProfile } from "@/pages/UserProfile";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

const profile = (cpf: string | null) => ({
  id: "1", email: "ana@example.com", fullName: "Ana Souza", phone: null, cpf, role: "USER", createdAt: "2026-09-19T00:00:00.000Z",
});

function mockApi(cpf: string | null) {
  apiMock.get.mockImplementation((path: string) =>
    path === "/users/me" ? Promise.resolve(profile(cpf)) : Promise.resolve({ balance: 0, positions: [] }),
  );
}

async function renderProfile(path = "/profile") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <UserProfile />
    </MemoryRouter>,
  );
  return screen.findByLabelText("CPF");
}

describe("UserProfile (CPF)", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
  });

  it("o corpo do perfil é renderizado uma vez só (sem cópia mobile/desktop duplicada)", async () => {
    mockApi(null);
    await renderProfile();

    expect(screen.getAllByLabelText("CPF")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Salvar alterações" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Adicionar saldo" })).toHaveLength(1);
  });

  it("vindo de #cpf (Completar CPF), o campo já abre focado", async () => {
    mockApi(null);
    const cpfField = await renderProfile("/profile#cpf");

    await waitFor(() => expect(cpfField).toHaveFocus());
  });

  it("sem #cpf, o campo não rouba o foco", async () => {
    mockApi(null);
    const cpfField = await renderProfile("/profile");

    expect(cpfField).not.toHaveFocus();
  });

  it("com CPF cadastrado, o campo é somente leitura e formatado, mesmo vindo de #cpf", async () => {
    mockApi("52998224725");
    const cpfField = (await renderProfile("/profile#cpf")) as HTMLInputElement;

    expect(cpfField).toBeDisabled();
    expect(cpfField.value).toBe("529.982.247-25");
    expect(screen.getByText("CPF cadastrado; não pode ser alterado.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar CPF" })).not.toBeInTheDocument();
  });
});
