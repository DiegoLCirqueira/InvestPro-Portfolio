import { describe, expect, it } from "vitest";
import {
  buildTickerOptions,
  findOwnedQuantity,
  getBuyQuantityError,
  getSellQuantityError,
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
