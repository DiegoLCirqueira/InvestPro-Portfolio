import { formatPercent } from "@/lib/format";
import type { OrderSide } from "@/types/order";

// Espelha ORDER_FEE_RATE de packages/server/src/modules/order/order.domain.ts.
// Único lugar do web que conhece o percentual — o resto da UI só consome
// ORDER_FEE_LABEL e computeOrderSettlement.
export const ORDER_FEE_RATE = 0.01;

export const ORDER_FEE_LABEL = formatPercent(ORDER_FEE_RATE * 100, {
  decimals: 0,
});

export interface OrderSettlement {
  total: number;
  fee: number;
  // BUY: o que sai da conta (total + taxa). SELL: o que entra (total − taxa).
  netAmount: number;
}

export function computeOrderSettlement(
  side: OrderSide,
  total: number,
): OrderSettlement {
  const fee = total * ORDER_FEE_RATE;
  return { total, fee, netAmount: side === "BUY" ? total + fee : total - fee };
}
