import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Recommendations } from "@/pages/Recommendations";

describe("Recommendations (conteúdo de exemplo)", () => {
  it("rotula a página como EXEMPLO e diz que não é personalizada nem recomendação de investimento", () => {
    render(<Recommendations />);

    expect(screen.getByText("Exemplo")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/ilustrativo/i);
    expect(screen.getByRole("note")).toHaveTextContent(/não é uma recomendação personalizada nem uma recomendação de investimento/i);
  });

  it("não alega personalização nem inteligência artificial", () => {
    const { container } = render(<Recommendations />);
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/seu perfil|inteligência artificial|de IA|gerad[ao]s? pel/i);
    expect(text).not.toMatch(/\d+%/); // sem "score" que pareça confiança de um modelo
  });
});
