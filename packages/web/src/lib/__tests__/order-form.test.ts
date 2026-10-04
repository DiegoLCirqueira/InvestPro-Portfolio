import { describe, expect, it } from "vitest";
import {
  buildTickerOptions,
  findOwnedQuantity,
  getBuyQuantityError,
  getSellQuantityError,
  quantityForAmount,
  sanitizeDecimalInput,
} from "@/lib/order-form";
import type { MarketAsset } from "@/types/market";
import type { SellableAsset } from "@/types/order";

const market: MarketAsset[] = [
  {
    id: "1",
    ticker: "PETR4",
    name: "Petrobras",
    type: "STOCK",
    price: 30,
    change24h: 0,
  },
  {
    id: "2",
    ticker: "BTC",
    name: "Bitcoin",
    type: "CRYPTO",
    price: 300000,
    change24h: 0,
  },
];
const sellable: SellableAsset[] = [{ ticker: "BTC", quantity: 0.5 }];

describe("order-form", () => {
  it("compra lista o catálogo de mercado", () => {
    const options = buildTickerOptions("BUY", market, sellable);
    expect(options.map((o) => o.value)).toEqual(["BTC", "PETR4"]);
    expect(options[1].description).toBe("Petrobras");
  });

  it("venda lista só o que o usuário possui, com a quantidade", () => {
    const options = buildTickerOptions("SELL", market, sellable);
    expect(options).toHaveLength(1);
    expect(options[0].value).toBe("BTC");
    expect(options[0].description).toContain("0,5");
  });

  it("acha a quantidade possuída ignorando caixa e espaços", () => {
    expect(findOwnedQuantity(sellable, " btc ")).toBe(0.5);
    expect(findOwnedQuantity(sellable, "PETR4")).toBeNull();
  });

  it("bloqueia venda acima da posição", () => {
    expect(getSellQuantityError(0.6, 0.5, "btc")).toContain("BTC");
    expect(getSellQuantityError(0.5, 0.5, "btc")).toBeNull();
    expect(getSellQuantityError(9, null, "btc")).toBeNull();
  });

  it("sanitiza decimal aceitando vírgula", () => {
    expect(sanitizeDecimalInput("1,5")).toBe("1.5");
    expect(sanitizeDecimalInput("")).toBe("");
    expect(sanitizeDecimalInput("abc")).toBeNull();
  });
});

describe("getBuyQuantityError (compra fracionada)", () => {
  it("ação só aceita quantidade inteira", () => {
    expect(getBuyQuantityError(1.5, market[0])).toMatch(/quantidade inteira/);
    expect(getBuyQuantityError(2, market[0])).toBeNull();
  });

  it("cripto aceita fração", () => {
    expect(getBuyQuantityError(0.001, market[1])).toBeNull();
  });

  it("sem ativo escolhido ainda, não acusa nada", () => {
    expect(getBuyQuantityError(1.5, undefined)).toBeNull();
  });
});

describe("quantityForAmount (compra de cripto por valor)", () => {
  it("divide o valor pelo preço", () => {
    expect(quantityForAmount(100, 400_000)).toBe(0.00025);
  });

  it("trunca em 8 casas, nunca arredonda para cima", () => {
    // 100 / 300.000 = 0,000333333333…; arredondar daria o mesmo, mas 2/3 mostra o corte:
    expect(quantityForAmount(100, 300_000)).toBe(0.00033333);
    expect(quantityForAmount(2, 3)).toBe(0.66666666);
  });

  it("não perde uma unidade por ruído de ponto flutuante", () => {
    // 0,3 / 0,1 em ponto flutuante dá 2,9999999999999996.
    expect(quantityForAmount(0.3, 0.1)).toBe(3);
  });

  it("valor ou preço zerados não compram nada", () => {
    expect(quantityForAmount(0, 100)).toBe(0);
    expect(quantityForAmount(100, 0)).toBe(0);
  });

  it("valor pequeno demais para 1 satoshi dá zero", () => {
    expect(quantityForAmount(0.01, 2_000_000_000)).toBe(0);
  });
});

describe("venda com posição reservada em vendas abertas", () => {
  it("desconta o reservado da posição e explica o motivo", () => {
    // 0,3 − 0,1 sem ruído de ponto flutuante: a venda de 0,2 passa.
    expect(getSellQuantityError(0.2, 0.3, "BTC", 0.1)).toBeNull();
    expect(getSellQuantityError(2, 4, "PETR4", 3)).toBe(
      "Você possui apenas 4 de PETR4, e 3 já estão em vendas abertas. Reduza a quantidade.",
    );
  });
});
