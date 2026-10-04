import type { ChangeEvent } from "react";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useOrderForm } from "@/hooks/use-order-form";
import { MIN_ORDER_TOTAL_MESSAGE } from "@/lib/order-form";
import type { MarketAsset } from "@/types/market";
import type { SellableAsset } from "@/types/order";

const BTC: MarketAsset = { id: "2", ticker: "BTC", name: "Bitcoin", type: "CRYPTO", price: 300_000, change24h: 0 };
const PETR4: MarketAsset = { id: "1", ticker: "PETR4", name: "Petrobras", type: "STOCK", price: 30, change24h: 0 };

// Simula a digitação no campo de moeda: os dígitos são os centavos ("10000" = R$ 100,00).
const digits = (value: string) => ({ target: { value } }) as ChangeEvent<HTMLInputElement>;

function renderOrderForm(
  ticker = "BTC",
  sellableAssets: SellableAsset[] = [],
  reservedPositions: Record<string, number> = {},
) {
  return renderHook(() =>
    useOrderForm({
      marketAssets: [BTC, PETR4],
      isMarketLoading: false,
      sellableAssets,
      isSellableLoading: false,
      initialTicker: ticker,
      reservedPositions,
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
    act(() => result.current.amountInput.onChange(digits("100"))); // R$ 1,00

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

describe("useOrderForm: valor mínimo por ordem (R$ 1,00)", () => {
  it("a mensagem fala do mínimo em reais", () => {
    expect(MIN_ORDER_TOTAL_MESSAGE).toMatch(/^O valor mínimo por ordem é R\$\s1,00$/);
  });

  it("total abaixo de R$ 1,00 avisa e impede o envio", () => {
    const { result } = renderOrderForm();
    act(() => result.current.setEntryMode("QUANTITY"));
    act(() => result.current.changeQuantity("0,000003")); // 0,000003 × 300.000 = R$ 0,90

    expect(result.current.quantityError).toBe(MIN_ORDER_TOTAL_MESSAGE);
    expect(result.current.findSubmitError()).toBe(MIN_ORDER_TOTAL_MESSAGE);
  });

  it("na compra por valor, R$ 0,99 avisa e R$ 1,00 passa", () => {
    const { result } = renderOrderForm();
    act(() => result.current.amountInput.onChange(digits("99")));
    expect(result.current.quantityError).toBe(MIN_ORDER_TOTAL_MESSAGE);

    act(() => result.current.amountInput.onChange(digits("100")));
    expect(result.current.quantityError).toBeNull();
  });

  it("LIMIT avalia o mínimo pelo preço informado", () => {
    const { result } = renderOrderForm("PETR4");
    act(() => result.current.setType("LIMIT"));
    act(() => result.current.priceInput.onChange(digits("50"))); // R$ 0,50
    act(() => result.current.changeQuantity("1"));

    expect(result.current.quantityError).toBe(MIN_ORDER_TOTAL_MESSAGE);
  });

  it("vender a posição inteira abaixo de R$ 1,00 é permitido; parte dela, não", () => {
    const { result } = renderOrderForm("BTC", [{ ticker: "BTC", quantity: 0.000002 }]);
    act(() => result.current.changeSide("SELL"));
    act(() => result.current.changeQuantity("0,000002")); // R$ 0,60, a posição toda
    expect(result.current.quantityError).toBeNull();

    act(() => result.current.changeQuantity("0,000001")); // R$ 0,30, metade
    expect(result.current.quantityError).toBe(MIN_ORDER_TOTAL_MESSAGE);
  });
});

describe("useOrderForm: posição reservada em vendas abertas", () => {
  it("toda venda (mercado ou limitada) só usa a posição livre", () => {
    const { result } = renderOrderForm("PETR4", [{ ticker: "PETR4", quantity: 10 }], { PETR4: 8 });
    act(() => result.current.changeSide("SELL"));
    act(() => result.current.changeQuantity("5"));
    expect(result.current.quantityError).toMatch(/8 já estão em vendas abertas/);

    act(() => result.current.changeQuantity("2"));
    expect(result.current.quantityError).toBeNull();

    act(() => result.current.setType("LIMIT"));
    act(() => result.current.priceInput.onChange(digits("3500")));
    act(() => result.current.changeQuantity("3"));
    expect(result.current.quantityError).toMatch(/8 já estão em vendas abertas/);
  });

  it("a reserva de outro ativo não limita a venda", () => {
    const { result } = renderOrderForm("PETR4", [{ ticker: "PETR4", quantity: 10 }], { VALE3: 50 });
    act(() => result.current.changeSide("SELL"));
    act(() => result.current.changeQuantity("10"));

    expect(result.current.quantityError).toBeNull();
  });
});
