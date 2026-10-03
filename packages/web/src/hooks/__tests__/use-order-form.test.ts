import type { ChangeEvent } from "react";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useOrderForm } from "@/hooks/use-order-form";
import type { MarketAsset } from "@/types/market";

const BTC: MarketAsset = { id: "2", ticker: "BTC", name: "Bitcoin", type: "CRYPTO", price: 300_000, change24h: 0 };
const PETR4: MarketAsset = { id: "1", ticker: "PETR4", name: "Petrobras", type: "STOCK", price: 30, change24h: 0 };

// Simula a digitação no campo de moeda: os dígitos são os centavos ("10000" = R$ 100,00).
const digits = (value: string) => ({ target: { value } }) as ChangeEvent<HTMLInputElement>;

function renderOrderForm(ticker = "BTC") {
  return renderHook(() =>
    useOrderForm({
      marketAssets: [BTC, PETR4],
      isMarketLoading: false,
      sellableAssets: [],
      isSellableLoading: false,
      initialTicker: ticker,
    }),
  );
}

describe("useOrderForm: compra de cripto por valor", () => {
  it("quantidade = valor / preço, truncada em 8 casas (nunca para cima)", () => {
    const { result } = renderOrderForm();
    act(() => result.current.amountInput.onChange(digits("10000"))); // R$ 100,00

    // 100 / 300.000 = 0,000333333…
    expect(result.current.estimatedQuantity).toBe(0.00033333);
    expect(result.current.buildInput().quantity).toBe(0.00033333);
    // Taxa e "Você pagará" sobre o que a quantidade truncada compra de fato,
    // em centavos como o servidor: 0,00033333 × 300.000 = 99,999 → R$ 100,00.
    expect(result.current.settlement?.total).toBe(100);
  });

  it("LIMIT usa o preço informado, não o de mercado", () => {
    const { result } = renderOrderForm();
    act(() => result.current.setType("LIMIT"));
    act(() => result.current.priceInput.onChange(digits("20000000"))); // R$ 200.000,00
    act(() => result.current.amountInput.onChange(digits("10000"))); // R$ 100,00

    expect(result.current.estimatedQuantity).toBe(0.0005);
    expect(result.current.findSubmitError()).toBeNull();
  });

  it("valor pequeno demais para a menor fração dá erro, sem enviar quantidade zero", () => {
    const { result } = renderOrderForm();
    act(() => result.current.setType("LIMIT"));
    act(() => result.current.priceInput.onChange(digits("99999999999"))); // R$ 999.999.999,99
    act(() => result.current.amountInput.onChange(digits("1"))); // R$ 0,01

    expect(result.current.estimatedQuantity).toBe(0);
    expect(result.current.quantityError).toMatch(/Valor baixo demais/);
    expect(result.current.findSubmitError()).toMatch(/Valor baixo demais/);
  });

  it("modo Quantidade continua disponível para cripto", () => {
    const { result } = renderOrderForm();
    act(() => result.current.setEntryMode("QUANTITY"));
    act(() => result.current.changeQuantity("0,5"));

    expect(result.current.entryMode).toBe("QUANTITY");
    expect(result.current.buildInput().quantity).toBe(0.5);
  });

  it("ações seguem só por quantidade inteira", () => {
    const { result } = renderOrderForm("PETR4");

    expect(result.current.canBuyByAmount).toBe(false);
    expect(result.current.entryMode).toBe("QUANTITY");
    act(() => result.current.changeQuantity("1,5"));
    expect(result.current.quantityError).toMatch(/quantidade inteira/);
  });
});
