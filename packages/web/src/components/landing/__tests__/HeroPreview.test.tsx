import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { HeroPreview } from "@/components/landing/HeroPreview";

describe("HeroPreview (Painel ilustrativo da página inicial)", () => {
  it("o Total de Seus Ativos é a soma dos itens, e a Caixinha não está na lista", () => {
    const { container } = render(<HeroPreview />);
    const text = container.textContent ?? "";

    // ITUB4 R$ 2.106,50 + BTC R$ 1.500,00.
    expect(text).toMatch(/Total\s*R\$\s?3\.606,50/);
    expect(text).not.toMatch(/Caixinha/);
  });
});
