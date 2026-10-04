import { describe, expect, it } from "vitest";
import { portfolioBreakdown } from "@/lib/portfolio-breakdown";

const sumCents = (items: { value: number }[]) =>
  items.reduce((sum, item) => sum + Math.round(item.value * 100), 0);

describe("portfolioBreakdown (partes do Valor total do portfólio)", () => {
  it("as quatro partes somam exatamente o total (caso do QA)", () => {
    const items = portfolioBreakdown({
      totalEquity: 9_990.15,
      cash: 8_214.36,
      positionValues: [52.17, 300.03, 77.1],
      savingsBox: 1_000,
    });

    expect(items?.map((item) => item.label)).toEqual([
      "Saldo em conta",
      "Investimentos",
      "Caixinha",
      "Moedas",
    ]);
    expect(items?.[1].value).toBe(429.3);
    expect(items?.[3].value).toBe(346.49);
    expect(sumCents(items ?? [])).toBe(999_015);
  });

  it("soma em centavos, sem ruído de ponto flutuante", () => {
    const items = portfolioBreakdown({
      totalEquity: 0.3,
      cash: 0.1,
      positionValues: [0.1],
      savingsBox: 0.1,
    });

    expect(items?.[3].value).toBe(0);
    expect(sumCents(items ?? [])).toBe(30);
  });

  it("dados de momentos diferentes (moedas negativas): sem detalhamento", () => {
    expect(
      portfolioBreakdown({ totalEquity: 100, cash: 100, positionValues: [], savingsBox: 50 }),
    ).toBeNull();
  });
});
