import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { formatCurrency, formatDateTime, formatQuantity, formatUnitPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { isCancellable, ORDER_TYPE_LABELS } from "@/lib/order-form";
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

// Largura mínima de "Compra" (a palavra maior) também em "Venda": a etiqueta do tipo logo depois
// começa na mesma posição em todas as linhas.
function SideText({ side }: { side: OrderSide }) {
  return side === "BUY" ? (
    <span className="min-w-17 shrink-0 text-brand-primary font-semibold">Compra</span>
  ) : (
    <span className="min-w-17 shrink-0 text-destructive font-semibold">Venda</span>
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

interface OrderRowProps {
  order: Order;
  /** Abre a confirmação de cancelamento; o botão (alvo do foco de volta) vai junto. */
  onCancel?: (order: Order, trigger: HTMLButtonElement) => void;
}

export function OrderRow({ order, onCancel }: OrderRowProps) {
  const { price, avgPrice, fee } = order;

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Largura mínima para 6 caracteres (BOVA11, USDBRL): "Compra"/"Venda" começa na mesma
              posição em todas as linhas. Ticker maior só alarga a própria linha. */}
          <span className="min-w-18 shrink-0 font-bold text-foreground">{order.ticker}</span>
          <SideText side={order.side} />
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
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
            <OrderDetail label="Preço" value={formatUnitPrice(price)} />
          )}
          {typeof avgPrice === "number" && (
            <OrderDetail label="PM" value={formatUnitPrice(avgPrice)} />
          )}
          {typeof fee === "number" && (
            <OrderDetail label="Taxa" value={formatCurrency(fee)} />
          )}
        </span>
        <span className="flex items-center gap-2">
          <span title={order.createdAt}>{formatDateTime(order.createdAt)}</span>
          {/* Só OPEN/PENDING. Alvo de 44px com margem negativa: a linha não cresce por causa dele. */}
          {onCancel && isCancellable(order.status) && (
            <Button
              variant="ghost"
              className="-my-3 -mr-2 px-2 text-xs text-destructive hover:text-destructive"
              aria-label={`Cancelar ordem de ${order.side === "BUY" ? "compra" : "venda"} de ${formatQuantity(order.quantity)} ${order.ticker}`}
              onClick={(event) => onCancel(order, event.currentTarget)}
            >
              Cancelar
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}
