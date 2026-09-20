import { describe, expect, it } from "vitest";
import { quoteKey, summaryFromExecution, summaryFromQuote } from "@/lib/exchange";

describe("exchange", () => {
  it("a chave da simulação muda com valor, De ou Para", () => {
    const base = quoteKey("BRL", "USD", 10);

    expect(quoteKey("BRL", "USD", 10)).toBe(base);
    expect(quoteKey("BRL", "USD", 11)).not.toBe(base);
    expect(quoteKey("BRL", "EUR", 10)).not.toBe(base);
    expect(quoteKey("USD", "BRL", 10)).not.toBe(base);
  });

  it("simulação e execução viram o mesmo formato de exibição", () => {
    const fromQuote = summaryFromQuote({
      from: "BRL", to: "USD", amount: 10, convertedAmount: 1.93, rate: 0.1944, fee: 0.1,
      timestamp: "2026-09-19T15:00:00.000Z",
    });
    const fromExecution = summaryFromExecution({
      id: "x", fromCurrency: "BRL", toCurrency: "USD", amount: 10, convertedAmount: 1.91,
      rate: 0.193, fee: 0.1, createdAt: "2026-09-19T15:01:00.000Z",
    });

    expect(fromQuote).toEqual({ from: "BRL", to: "USD", amount: 10, convertedAmount: 1.93, rate: 0.1944, fee: 0.1, at: "2026-09-19T15:00:00.000Z" });
    expect(fromExecution.convertedAmount).toBe(1.91);
    expect(fromExecution.at).toBe("2026-09-19T15:01:00.000Z");
  });
});
