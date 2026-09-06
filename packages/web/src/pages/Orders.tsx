import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { toast } from "sonner";
import { ClipboardList, LogIn } from "lucide-react";
import { OrdersSkeleton } from "@/components/skeletons/OrdersSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { useCreateOrder, useOrders } from "@/hooks/use-orders";
import { useMarketAssets } from "@/hooks/use-market-assets";
import { ApiError } from "@/services/api";
import { formatDateTime } from "@/lib/format";
import type {
  Order,
  OrderSide,
  OrderStatus,
  OrderType,
} from "@/types/order";
import type { MarketAsset } from "@/types/market";

const SIDE_OPTIONS: { value: OrderSide; label: string }[] = [
  { value: "BUY", label: "Compra" },
  { value: "SELL", label: "Venda" },
];

const TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: "MARKET", label: "Mercado" },
  { value: "LIMIT", label: "Limitada" },
  { value: "STOP", label: "Stop" },
];

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

function OrderRow({ order }: { order: Order }) {
  const showPrice = typeof order.price === "number";
  return (
    <div className="p-4 rounded-xl border border-border bg-surface-2">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-foreground">{order.ticker}</span>
          <SideText side={order.side} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {order.type}
          </span>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Qtd: <span className="text-foreground font-semibold tabular-nums">{order.quantity}</span>
          {showPrice && (
            <>
              {" "}
              · Preço:{" "}
              <span className="text-foreground font-semibold tabular-nums">
                {order.price}
              </span>
            </>
          )}
          {order.avgPrice !== null && (
            <>
              {" "}
              · PM:{" "}
              <span className="text-foreground font-semibold tabular-nums">
                {order.avgPrice}
              </span>
            </>
          )}
        </span>
        <span title={order.createdAt}>{formatDateTime(order.createdAt)}</span>
      </div>
    </div>
  );
}

interface TickerComboboxProps {
  value: string;
  onChange: (ticker: string) => void;
  assets: MarketAsset[];
  isLoading: boolean;
}

function TickerCombobox({ value, onChange, assets, isLoading }: TickerComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = value.trim().toLowerCase();
  const filtered = [...assets]
    .sort((a, b) => a.ticker.localeCompare(b.ticker))
    .filter(
      (asset) =>
        !query ||
        asset.ticker.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query),
    );

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="ex.: PETR4"
        autoComplete="off"
        className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-input text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary transition-colors duration-200 uppercase"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-input bg-surface-2 shadow-lg custom-scrollbar">
          {isLoading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Carregando ativos...</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum ativo encontrado.</p>
          ) : (
            filtered.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => {
                  onChange(asset.ticker);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-secondary/60 transition-colors"
              >
                <span className="font-bold text-sm text-foreground">{asset.ticker}</span>
                <span className="text-[10px] text-muted-foreground truncate ml-2">
                  {asset.name}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function Orders() {
  const { data, error, isLoading, refetch } = useOrders();
  const { data: assetsData, isLoading: assetsLoading } = useMarketAssets();
  const createOrder = useCreateOrder({
    onSuccess: () => toast.success("Ordem criada com sucesso!"),
    onError: (err) =>
      toast.error(
        err instanceof ApiError && err.status === 401
          ? "Sessão expirada. Faça login novamente."
          : err.message,
      ),
  });

  const [ticker, setTicker] = useState("");
  const [side, setSide] = useState<OrderSide>("BUY");
  const [type, setType] = useState<OrderType>("MARKET");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");

  const isUnauthorized = error instanceof ApiError && error.status === 401;
  const needsPrice = type === "LIMIT" || type === "STOP";

  const orders = data?.items ?? [];

  const resetForm = () => {
    setTicker("");
    setSide("BUY");
    setType("MARKET");
    setQuantity("");
    setPrice("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!ticker.trim() || !Number.isFinite(qty) || qty <= 0) {
      toast.error("Informe um ticker e uma quantidade válida.");
      return;
    }
    if (needsPrice) {
      const p = Number(price);
      if (!Number.isFinite(p) || p <= 0) {
        toast.error("Preencha um preço válido para este tipo de ordem.");
        return;
      }
      try {
        await createOrder.mutate({
          ticker: ticker.trim().toUpperCase(),
          side,
          type,
          quantity: qty,
          price: p,
        });
      } catch {
        return;
      }
    } else {
      try {
        await createOrder.mutate({
          ticker: ticker.trim().toUpperCase(),
          side,
          type,
          quantity: qty,
        });
      } catch {
        return;
      }
    }
    resetForm();
    void refetch();
  };

  const handleNumeric = (
    e: ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void,
  ) => {
    const value = e.target.value.replace(",", ".");
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 animate-in fade-in duration-300">
        <OrdersSkeleton />
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh]">
        <EmptyState
          icon={LogIn}
          title="Ordens indisponíveis"
          message="É necessário estar autenticado para visualizar e criar ordens."
          action={{ label: "Fazer login", to: "/login" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar as ordens"
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-foreground mb-1">Ordens</h2>
        <p className="text-muted-foreground text-sm">
          Envie e acompanhe suas ordens de compra e venda.
        </p>
      </header>

      <div className="grid grid-cols-1 nav:grid-cols-5 gap-4 items-start">
        <form
          onSubmit={handleSubmit}
          className="nav:col-span-2 p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-5"
        >
          <h3 className="text-base font-bold text-foreground">Nova Ordem</h3>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">Ticker</label>
            <TickerCombobox
              value={ticker}
              onChange={setTicker}
              assets={assetsData?.items ?? []}
              isLoading={assetsLoading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">Lado</label>
            <div className="grid grid-cols-2 gap-2">
              {SIDE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSide(option.value)}
                  className={`min-h-11 py-2.5 rounded-xl border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    side === option.value
                      ? option.value === "BUY"
                        ? "bg-brand-primary text-black border-brand-primary"
                        : "bg-destructive text-white border-destructive"
                      : "bg-surface-2 text-muted-foreground border-input hover:border-border-strong"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as OrderType)}
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-input text-foreground text-base focus:outline-none focus:border-brand-primary transition-colors duration-200 cursor-pointer"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-surface-2">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">Quantidade</label>
            <input
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => handleNumeric(e, setQuantity)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-input text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary transition-colors duration-200"
            />
          </div>

          {needsPrice && (
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Preço</label>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => handleNumeric(e, setPrice)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-input text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary transition-colors duration-200"
              />
            </div>
          )}

          {createOrder.error && (
            <p className="text-xs text-destructive">{createOrder.error.message}</p>
          )}

          <button
            type="submit"
            disabled={createOrder.isPending}
            className="min-h-11 w-full py-3 rounded-xl bg-brand-primary hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-white font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {createOrder.isPending ? "Enviando..." : "Enviar Ordem"}
          </button>
        </form>

        <div className="nav:col-span-3 p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-4">
          <h3 className="text-base font-bold text-foreground">
            Histórico de Ordens
          </h3>

          {orders.length === 0 ? (
            <EmptyState icon={ClipboardList} message="Nenhuma ordem registrada ainda." />
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
