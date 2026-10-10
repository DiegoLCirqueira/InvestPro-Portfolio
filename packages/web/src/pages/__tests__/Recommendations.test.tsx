import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Recommendations } from "@/pages/Recommendations";
import type { RecommendationsResponse } from "@/types/investor-profile";

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, api: apiMock };
});

// savingsBox: saldo na Caixinha (GET /savings-box), que muda a ação de "reduzir renda fixa".
function renderWith(response: RecommendationsResponse, savingsBox = 0) {
  apiMock.get.mockImplementation((path: string) =>
    Promise.resolve(
      path === "/savings-box" ? { balance: savingsBox, rate: 0.06, estimatedYield: 0 } : response,
    ),
  );
  return render(
    <MemoryRouter>
      <Recommendations />
    </MemoryRouter>,
  );
}

describe("Recommendations (pelo perfil de investidor)", () => {
  beforeEach(() => apiMock.get.mockReset());

  it("sem perfil: convida a responder o questionário e não mostra comparação de carteira", async () => {
    renderWith({
      profile: null,
      allocation: [],
      items: [
        {
          id: "take-questionnaire",
          category: "PROFILE",
          title: "Descubra seu perfil de investidor",
          description: "Responda 7 perguntas rápidas.",
        },
      ],
    });

    const cta = await screen.findByRole("link", { name: /Responder o questionário/ });
    expect(cta).toHaveAttribute("href", "/profile/investor-profile");
    expect(screen.queryByText("Sua carteira x referência")).not.toBeInTheDocument();
  });

  it("com perfil: mostra o perfil, as sugestões e a carteira atual x referência", async () => {
    renderWith({
      profile: "MODERATE",
      allocation: [
        { type: "FIXED_INCOME", label: "Renda Fixa", currentPct: 20, targetPct: 45 },
        { type: "STOCK", label: "Ações", currentPct: 80, targetPct: 35 },
      ],
      items: [
        {
          id: "reduce-STOCK",
          category: "RISK",
          title: "Reduzir a exposição a ações",
          description: "Hoje ações representam 80% do que você tem investido.",
        },
      ],
    });

    expect(await screen.findByText("Moderado")).toBeInTheDocument();
    expect(screen.getByText("Reduzir a exposição a ações")).toBeInTheDocument();
    expect(screen.getByText("Risco")).toBeInTheDocument();
    expect(screen.getByText("Sua carteira x referência")).toBeInTheDocument();
    // O rótulo vem do site ("Renda fixa"), não do label da API ("Renda Fixa").
    expect(screen.getByText("Renda fixa")).toBeInTheDocument();
  });

  it("cada sugestão leva à próxima ação, já no destino certo", async () => {
    renderWith({
      profile: "MODERATE",
      allocation: [],
      items: [
        { id: "idle-cash", category: "OPPORTUNITY", title: "Dinheiro parado em conta", description: "..." },
        { id: "increase-FIXED_INCOME", category: "DIVERSIFICATION", title: "Aumentar a posição em renda fixa", description: "..." },
        { id: "increase-FOREIGN_CURRENCY", category: "DIVERSIFICATION", title: "Aumentar a posição em moedas", description: "..." },
        { id: "aligned", category: "ALIGNED", title: "Carteira alinhada ao seu perfil", description: "..." },
      ],
    });

    expect(await screen.findByRole("link", { name: /Depositar na Caixinha/ })).toHaveAttribute("href", "/caixinha");
    expect(screen.getByRole("link", { name: /Ver ativos no Mercado/ })).toHaveAttribute("href", "/market?tipo=FIXED_INCOME");
    expect(screen.getByRole("link", { name: /Ir para o Câmbio/ })).toHaveAttribute("href", "/exchange");
    expect(screen.getAllByRole("link", { name: /Depositar|Ver ativos|Ir para/ })).toHaveLength(3);
  });

  it("reduzir moedas estrangeiras leva ao Câmbio (é lá que se vende moeda), reduzir ações a Ordens", async () => {
    renderWith({
      profile: "MODERATE",
      allocation: [],
      items: [
        { id: "reduce-FOREIGN_CURRENCY", category: "RISK", title: "Reduzir a exposição a moedas estrangeiras", description: "..." },
        { id: "reduce-STOCK", category: "RISK", title: "Reduzir a exposição a ações", description: "..." },
      ],
    });

    expect(await screen.findByRole("link", { name: /Ir para o Câmbio/ })).toHaveAttribute("href", "/exchange");
    expect(screen.getByRole("link", { name: /Ir para Ordens/ })).toHaveAttribute("href", "/orders");
  });

  describe("reduzir renda fixa", () => {
    const reduceFixedIncome = {
      profile: "MODERATE" as const,
      allocation: [],
      items: [
        {
          id: "reduce-FIXED_INCOME",
          category: "RISK" as const,
          title: "Reduzir a exposição a renda fixa",
          description: "Hoje renda fixa (inclui R$ 1.500,00 na Caixinha) representa 64,4%…",
        },
      ],
    };

    it("com saldo na Caixinha: leva para a Caixinha (em Ordens não dá para reduzi-la)", async () => {
      renderWith(reduceFixedIncome, 1_500);

      expect(await screen.findByRole("link", { name: /Ir para a Caixinha/ })).toHaveAttribute(
        "href",
        "/caixinha",
      );
      expect(screen.queryByRole("link", { name: /Ir para Ordens/ })).not.toBeInTheDocument();
    });

    it("sem saldo na Caixinha: continua indo para Ordens", async () => {
      renderWith(reduceFixedIncome, 0);

      expect(await screen.findByRole("link", { name: /Ir para Ordens/ })).toHaveAttribute(
        "href",
        "/orders",
      );
      expect(screen.queryByRole("link", { name: /Ir para a Caixinha/ })).not.toBeInTheDocument();
    });
  });

  it("deixa claro que é conteúdo educativo, sem alegar inteligência artificial", async () => {
    const { container } = renderWith({ profile: null, allocation: [], items: [] });
    await screen.findByRole("note");

    expect(screen.getByRole("note")).toHaveTextContent(/não são uma recomendação de investimento/i);
    expect(container.textContent ?? "").not.toMatch(/inteligência artificial|de IA/i);
  });
});
