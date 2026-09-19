import { describe, expect, it } from "vitest";
import {
  computeOrderSettlement,
  ORDER_FEE_LABEL,
  ORDER_FEE_RATE,
} from "@/lib/order-fee";

describe("order-fee", () => {
  it("expõe a taxa de 1% e o rótulo correspondente", () => {
    expect(ORDER_FEE_RATE).toBe(0.01);
    expect(ORDER_FEE_LABEL).toBe("1%");
  });

  it("compra soma a taxa ao total", () => {
    const { fee, netAmount } = computeOrderSettlement("BUY", 1000);
    expect(fee).toBeCloseTo(10);
    expect(netAmount).toBeCloseTo(1010);
  });

  it("venda desconta a taxa do total", () => {
    const { fee, netAmount } = computeOrderSettlement("SELL", 1000);
    expect(fee).toBeCloseTo(10);
    expect(netAmount).toBeCloseTo(990);
  });
});
