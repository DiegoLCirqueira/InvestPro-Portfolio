import { describe, expect, it } from "vitest";
import {
  missingAmount,
  shortfallAdjustLabel,
  shortfallCostSentence,
  shortfallNote,
} from "@/lib/balance-shortfall";
import { transferCost } from "@/lib/transfer-fee";

describe("balance-shortfall", () => {
  it("o que falta sai em centavos exatos, sem resto de ponto flutuante", () => {
    expect(missingAmount({ kind: "order", cost: 100.3, available: 100.1 })).toBe(0.2);
  });

  it("se pela conta da tela o saldo bastava, não falta nada", () => {
    expect(missingAmount({ kind: "order", cost: 50, available: 80 })).toBe(0);
  });

  it("frase, nota e ação mudam conforme a operação", () => {
    const order = { kind: "order" as const, cost: 1010, available: 0, ticker: "PETR4" };
    expect(shortfallCostSentence(order)).toMatch(/^Esta ordem custa R\$\s?1\.010,00$/);
    expect(shortfallNote(order)).toBe("Valor que falta para a sua ordem de PETR4.");
    expect(shortfallAdjustLabel(order)).toBe("Ajustar a ordem");

    const ted = { kind: "transfer" as const, cost: 110, available: 0, hasFee: true };
    expect(shortfallCostSentence(ted)).toMatch(/com a tarifa$/);
    expect(shortfallAdjustLabel(ted)).toBe("Ajustar o valor");
  });

  it("a transferência soma a tarifa do tipo (PIX grátis, TED R$ 10, DOC R$ 5)", () => {
    expect(transferCost("PIX", 100)).toBe(100);
    expect(transferCost("TED", 100)).toBe(110);
    expect(transferCost("DOC", 100)).toBe(105);
  });
});
