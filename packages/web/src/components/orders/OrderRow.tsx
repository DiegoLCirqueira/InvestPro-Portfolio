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
    <span className="text-brand-primary font-semibold">Compra</span>
  ) : (
    <span className="text-destructive font-semibold">Venda</span>
  );
}

// Célula da grade de valores: rótulo pequeno acima, número à direita. Sem valor (PM na venda,
// taxa antes de executar) a célula continua lá com "—", para nada se deslocar.
function OrderDetail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-w-0 flex-col items-end">
      <dt className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate text-xs font-semibold tabular-nums text-foreground">
        {value ?? (
          <>
            <span aria-hidden="true" className="text-muted-foreground">
              —
            </span>
            <span className="sr-only">sem valor</span>
          </>
        )}
      </dd>
    </div>
  );
}

const currencyOrNull = (value: number | null | undefined) =>
  typeof value === "number" ? formatCurrency(value) : null;

export function OrderRow({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-bold text-foreground">{order.ticker}</span>
          <SideText side={order.side} />
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            {ORDER_TYPE_LABELS[order.type]}
          </span>
        </div>
        {/* Data junto do selo: a linha de baixo fica só para a grade de valores. */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <OrderStatusBadge status={order.status} />
          <span title={order.createdAt} className="text-xs text-muted-foreground">
            {formatDateTime(order.createdAt)}
          </span>
        </div>
      </div>
      {/* Mesmas 4 células, de mesma largura, em toda linha: Qtd, Preço, PM e Taxa ficam na mesma
          coluna em todo o histórico (antes o texto corrido se deslocava quando faltava o PM).
          No celular, 2x2 para não estourar a largura. */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <OrderDetail label="Qtd" value={formatQuantity(order.quantity)} />
        <OrderDetail label="Preço" value={currencyOrNull(order.price)} />
        <OrderDetail label="PM" value={currencyOrNull(order.avgPrice)} />
        <OrderDetail label="Taxa" value={currencyOrNull(order.fee)} />
      </dl>
    </div>
  );
}
