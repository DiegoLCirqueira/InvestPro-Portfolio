import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { InvestorProfile } from "@/pages/InvestorProfile";
import type { InvestorProfileResponse, InvestorQuestionnaire } from "@/types/investor-profile";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

const questionnaire: InvestorQuestionnaire = {
  questions: [
    { id: "goal", title: "Qual é o seu objetivo?", options: [{ id: "preserve", label: "Preservar" }, { id: "grow", label: "Crescer" }] },
    { id: "horizon", title: "Por quanto tempo?", options: [{ id: "short", label: "Pouco" }, { id: "long", label: "Muito" }] },
  ],
  profiles: [
    {
      type: "AGGRESSIVE",
      label: "Arrojado",
      description: "Foco em crescimento.",
      targetAllocation: { FIXED_INCOME: 20, STOCK: 50, CRYPTO: 20, FOREIGN_CURRENCY: 10 },
    },
  ],
};

const savedAggressive: InvestorProfileResponse = {
  profile: { type: "AGGRESSIVE", score: 28, answeredAt: "2026-09-27T12:00:00.000Z" },
};

function mockApi(initial: InvestorProfileResponse) {
  let current = initial;
  apiMock.get.mockImplementation((path: string) =>
    Promise.resolve(path.endsWith("/questionnaire") ? questionnaire : current),
  );
  apiMock.put.mockImplementation(() => {
    current = savedAggressive;
    return Promise.resolve(savedAggressive);
  });
}

function renderPage() {
  render(
    <MemoryRouter>
      <InvestorProfile />
    </MemoryRouter>,
  );
}

describe("InvestorProfile (questionário)", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.put.mockReset();
  });

  it("uma pergunta por vez: só avança com uma opção escolhida e envia só as respostas", async () => {
    mockApi({ profile: null });
    renderPage();

    expect(await screen.findByText("Qual é o seu objetivo?")).toBeInTheDocument();
    expect(screen.getByText("Pergunta 1 de 2")).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "Próxima" });
    expect(next).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Crescer"));
    fireEvent.click(next);

    expect(await screen.findByText("Por quanto tempo?")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Muito"));
    fireEvent.click(screen.getByRole("button", { name: "Ver meu perfil" }));

    await waitFor(() =>
      expect(apiMock.put).toHaveBeenCalledWith("/users/me/investor-profile", {
        answers: { goal: "grow", horizon: "long" },
      }),
    );
    expect(await screen.findByText("Arrojado")).toBeInTheDocument();
  });

  it("voltar mantém a resposta já escolhida", async () => {
    mockApi({ profile: null });
    renderPage();

    fireEvent.click(await screen.findByLabelText("Preservar"));
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    fireEvent.click(await screen.findByRole("button", { name: "Voltar" }));

    expect(await screen.findByLabelText("Preservar")).toBeChecked();
  });

  it("com perfil salvo: mostra o resultado, a carteira de referência e permite refazer", async () => {
    mockApi(savedAggressive);
    renderPage();

    expect(await screen.findByText("Arrojado")).toBeInTheDocument();
    expect(screen.getByText("Carteira de referência")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver recomendações para mim" })).toHaveAttribute("href", "/recommendations");

    fireEvent.click(screen.getByRole("button", { name: /Refazer questionário/ }));
    expect(await screen.findByText("Pergunta 1 de 2")).toBeInTheDocument();
  });
});
