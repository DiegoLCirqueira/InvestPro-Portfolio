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

function renderWith(response: RecommendationsResponse) {
  apiMock.get.mockResolvedValue(response);
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
    expect(screen.getByText("Renda Fixa")).toBeInTheDocument();
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

    expect(await screen.findByRole("link", { name: /Depositar na caixinha/ })).toHaveAttribute("href", "/#caixinha");
    expect(screen.getByRole("link", { name: /Ver ativos no Mercado/ })).toHaveAttribute("href", "/market?tipo=FIXED_INCOME");
    expect(screen.getByRole("link", { name: /Ir para o Câmbio/ })).toHaveAttribute("href", "/exchange");
    expect(screen.getAllByRole("link", { name: /Depositar|Ver ativos|Ir para/ })).toHaveLength(3);
  });

  it("deixa claro que é conteúdo educativo, sem alegar inteligência artificial", async () => {
    const { container } = renderWith({ profile: null, allocation: [], items: [] });
    await screen.findByRole("note");

    expect(screen.getByRole("note")).toHaveTextContent(/não são uma recomendação de investimento/i);
    expect(container.textContent ?? "").not.toMatch(/inteligência artificial|de IA/i);
  });
});
