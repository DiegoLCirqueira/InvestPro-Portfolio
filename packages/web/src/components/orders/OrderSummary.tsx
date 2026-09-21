import { FormField, fieldInputClassName } from "@/components/FormField";
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

export function OrderSummary({ side, settlement, isPriceEstimated }: OrderSummaryProps) {
  return (
    <div className="flex flex-col gap-3">
      <FormField label="Valor total" htmlFor="order-total">
        <input
          id="order-total"
          type="text"
          readOnly
          disabled
          value={formatOrPlaceholder(settlement?.total)}
          className={`${fieldInputClassName} tabular-nums opacity-60 cursor-not-allowed`}
        />
      </FormField>
      {isPriceEstimated && <p className="text-xs text-muted-foreground">{ESTIMATED_PRICE_ORDER_NOTE}</p>}

      <dl className="flex flex-col gap-2 text-sm" aria-live="polite">
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
    </div>
  );
}
