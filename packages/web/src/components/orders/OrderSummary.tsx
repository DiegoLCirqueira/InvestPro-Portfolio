import { formatCurrency } from "@/lib/format";
import { ESTIMATED_PRICE_ORDER_NOTE } from "@/lib/market";
import { ORDER_FEE_LABEL, type OrderSettlement } from "@/lib/order-fee";
import type { OrderSide } from "@/types/order";

const NET_AMOUNT_LABEL: Record<OrderSide, string> = {
  BUY: "Você pagará",
  SELL: "Você receberá",
};

interface OrderSummaryProps {
  side: OrderSide;
  settlement: OrderSettlement | null;
  isPriceEstimated: boolean;
}

function formatOrPlaceholder(value: number | undefined): string {
  return value === undefined ? "—" : formatCurrency(value);
}

// Valores calculados como linhas de resumo (rótulo à esquerda, valor à direita), sem caixa:
// o "Valor total" era um campo igual aos que o usuário preenche e convidava a digitar nele.
export function OrderSummary({ side, settlement, isPriceEstimated }: OrderSummaryProps) {
  return (
    <dl className="flex flex-col gap-2 text-sm" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Valor total</dt>
        <dd className="text-foreground font-semibold tabular-nums">
          {formatOrPlaceholder(settlement?.total)}
        </dd>
        {isPriceEstimated && (
          <dd className="basis-full text-xs text-muted-foreground">{ESTIMATED_PRICE_ORDER_NOTE}</dd>
        )}
      </div>
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">Taxa InvestPro ({ORDER_FEE_LABEL})</dt>
        <dd className="text-foreground font-semibold tabular-nums">
          {formatOrPlaceholder(settlement?.fee)}
        </dd>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-2">
        <dt className="text-foreground font-bold">{NET_AMOUNT_LABEL[side]}</dt>
        <dd className="text-lg font-bold text-brand-primary tabular-nums">
          {formatOrPlaceholder(settlement?.netAmount)}
        </dd>
      </div>
    </dl>
  );
}
