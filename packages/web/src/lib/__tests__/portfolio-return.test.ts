import { describe, expect, it } from "vitest";
import { periodGain } from "@/lib/portfolio-return";

describe("periodGain", () => {
  it("depósito não conta como rendimento", () => {
    const history = [
      { date: "2026-09-25", balance: 1000, netFlow: 1000 },
      { date: "2026-09-26", balance: 1010, netFlow: 10 },
    ];
    expect(periodGain(history)).toBe(0);
  });

  it("desconta aportes e retiradas e fica com a variação de mercado", () => {
    const history = [
      { date: "2026-09-24", balance: 1000, netFlow: 0 },
      { date: "2026-09-25", balance: 1520, netFlow: 500 },
      { date: "2026-09-26", balance: 1415, netFlow: -100 },
    ];
    expect(periodGain(history)).toBe(15);
  });

  it("sem base de comparação devolve null", () => {
    expect(periodGain([{ date: "2026-09-26", balance: 1000, netFlow: 1000 }])).toBeNull();
  });
});
