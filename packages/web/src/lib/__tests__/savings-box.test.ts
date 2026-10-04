import { describe, expect, it } from "vitest";
import { formatSavingsShare, savingsShare } from "@/lib/savings-box";

describe("parte do dinheiro livre na Caixinha", () => {
  it("calcula a % exata, sem arredondar", () => {
    expect(savingsShare(10_980.42, 15.5)).toBeCloseTo(99.859, 2);
    expect(savingsShare(0, 0)).toBe(0);
  });

  it("não chega a 100% nem a 0% por arredondamento", () => {
    expect(formatSavingsShare(savingsShare(10_980.42, 15.5))).toBe("mais de 99%");
    expect(formatSavingsShare(0.3)).toBe("menos de 1%");
  });

  it("valores exatos e intermediários seguem o formatPercent inteiro", () => {
    expect(formatSavingsShare(100)).toBe("100%");
    expect(formatSavingsShare(0)).toBe("0%");
    expect(formatSavingsShare(99)).toBe("99%");
    expect(formatSavingsShare(70.59)).toBe("71%");
  });
});
