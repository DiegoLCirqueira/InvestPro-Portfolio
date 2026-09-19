import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ExchangeResultCard } from "@/components/exchange/ExchangeResultCard";

describe("ExchangeResultCard", () => {
  it("mostra a cotação com vírgula e 4 casas (pt-BR)", () => {
    const { container } = render(
      <ExchangeResultCard
        result={{
          id: "1",
          fromCurrency: "BRL",
          toCurrency: "USD",
          amount: 10,
          convertedAmount: 1.93,
          rate: 0.1944,
          fee: 0.1,
          createdAt: "2026-09-19T15:16:09.000Z",
        }}
      />,
    );
    const text = container.textContent ?? "";

    expect(text).toContain("0,1944");
    expect(text).not.toContain("0.1944");
  });
});
