import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format";
import { ORDER_TYPE_LABELS } from "@/lib/order-form";
import type { Order, OrderSide, OrderStatus } from "@/types/order";

const STATUS_CONFIG: Record<OrderStatus, { label: string; tone: StatusTone }> =
  {
    PENDING: { label: "Pendente", tone: "warning" },
    OPEN: { label: "Aberta", tone: "info" },
    PARTIALLY_FILLED: { label: "Parcial", tone: "purple" },
    FILLED: { label: "Executada", tone: "success" },
    CANCELLED: { label: "Cancelada", tone: "neutral" },
    REJECTED: { label: "Rejeitada", tone: "danger" },
  };

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return <StatusBadge label={config.label} tone={config.tone} />;
}

function SideText({ side }: { side: OrderSide }) {
  return side === "BUY" ? (
    <span className="text-brand-primary font-bold">Compra</span>
  ) : (
    <span className="text-destructive font-bold">Venda</span>
  );
}

function OrderDetail({ label, value }: { label: string; value: string }) {
  return (
    <>
      {" · "}
      {label}:{" "}
      <span className="text-foreground font-semibold tabular-nums">
        {value}
      </span>
    </>
  );
}

export function OrderRow({ order }: { order: Order }) {
  const { price, avgPrice, fee } = order;

  return (
    <div className="p-4 rounded-xl border border-border bg-surface-2">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-foreground">{order.ticker}</span>
          <SideText side={order.side} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {ORDER_TYPE_LABELS[order.type]}
          </span>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Qtd:{" "}
          <span className="text-foreground font-semibold tabular-nums">
            {formatQuantity(order.quantity)}
          </span>
          {typeof price === "number" && (
            <OrderDetail label="Preço" value={formatCurrency(price)} />
          )}
          {typeof avgPrice === "number" && (
            <OrderDetail label="PM" value={formatCurrency(avgPrice)} />
          )}
          {typeof fee === "number" && (
            <OrderDetail label="Taxa" value={formatCurrency(fee)} />
          )}
        </span>
        <span title={order.createdAt}>{formatDateTime(order.createdAt)}</span>
      </div>
    </div>
  );
}
