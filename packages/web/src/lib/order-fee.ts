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

const round2 = (value: number) => Math.round(value * 100) / 100;

// Arredonda como o servidor (order.service: round2 do total e do total ± taxa),
// para o "Você pagará" e a checagem de saldo baterem com o que é debitado.
export function computeOrderSettlement(
  side: OrderSide,
  rawTotal: number,
): OrderSettlement {
  const total = round2(rawTotal);
  const fee = total * ORDER_FEE_RATE;
  const netAmount = round2(side === "BUY" ? total + fee : total - fee);
  return { total, fee, netAmount };
}
