import { describe, expect, it } from "vitest";
import {
  missingAmount,
  savingsBoxDraw,
  shortfallAdjustLabel,
  shortfallCostSentence,
  shortfallHoldings,
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

  it("com a Caixinha, ela cobre só a diferença e o que falta já a desconta", () => {
    const covered = { kind: "order" as const, cost: 969.4, available: 550, savingsBox: 3_000 };
    expect(savingsBoxDraw(covered)).toBe(419.4);
    expect(missingAmount(covered)).toBe(0);

    const short = { kind: "order" as const, cost: 4_846.99, available: 550, savingsBox: 3_000 };
    expect(savingsBoxDraw(short)).toBe(3_000);
    expect(missingAmount(short)).toBe(1_296.99);

    const enough = { kind: "order" as const, cost: 300, available: 550, savingsBox: 3_000 };
    expect(savingsBoxDraw(enough)).toBe(0);
  });

  it("o que a pessoa tem inclui a Caixinha só quando ela conta", () => {
    expect(shortfallHoldings({ kind: "order", cost: 0, available: 550 })).toMatch(
      /^R\$\s?550,00 em conta$/,
    );
    expect(
      shortfallHoldings({ kind: "order", cost: 0, available: 550, savingsBox: 3_000 }),
    ).toMatch(/^R\$\s?550,00 em conta e R\$\s?3\.000,00 na Caixinha$/);
  });
});

describe("balance-shortfall: saldo reservado em ordens abertas", () => {
  it("diz que o valor é o livre e quanto está reservado", () => {
    expect(
      shortfallHoldings({ kind: "order", cost: 500, available: 197, reserved: 303 }),
    ).toMatch(/^R\$\s?197,00 livres em conta \(R\$\s?303,00 reservados em ordens abertas\)$/);
  });
});
