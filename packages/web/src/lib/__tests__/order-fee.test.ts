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

  it("arredonda como o servidor: total e valor final em centavos", () => {
    // 3 x 33,335 = 100,005 → total 100,01; +1% = 101,0101 → R$ 101,01
    const { total, netAmount } = computeOrderSettlement("BUY", 3 * 33.335);
    expect(total).toBe(100.01);
    expect(netAmount).toBe(101.01);
  });
});
