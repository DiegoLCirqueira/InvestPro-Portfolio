import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { OrdersSkeleton } from "@/components/skeletons/OrdersSkeleton";
import { useCreateOrder, useOrders } from "@/hooks/use-orders";
import { ApiError } from "@/services/api";
import type {
  Order,
  OrderSide,
  OrderStatus,
  OrderType,
} from "@/types/order";

const SIDE_OPTIONS: { value: OrderSide; label: string }[] = [
  { value: "BUY", label: "Compra" },
  { value: "SELL", label: "Venda" },
];

const TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: "MARKET", label: "Mercado" },
  { value: "LIMIT", label: "Limitada" },
  { value: "STOP", label: "Stop" },
];

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> =
  {
    PENDING: { label: "Pendente", className: "bg-amber-600/15 text-amber-400" },
    OPEN: { label: "Aberta", className: "bg-blue-500/15 text-blue-400" },
    PARTIALLY_FILLED: {
      label: "Parcial",
      className: "bg-purple-500/15 text-purple-400",
    },
    FILLED: { label: "Executada", className: "bg-brand-primary/15 text-brand-primary" },
    CANCELLED: { label: "Cancelada", className: "bg-gray-700/30 text-gray-400" },
    REJECTED: { label: "Rejeitada", className: "bg-red-500/15 text-red-500" },
  };

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span
      className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

function SideText({ side }: { side: OrderSide }) {
  return side === "BUY" ? (
    <span className="text-brand-primary font-bold">Compra</span>
  ) : (
    <span className="text-red-500 font-bold">Venda</span>
  );
}

function OrderRow({ order }: { order: Order }) {
  const showPrice = typeof order.price === "number";
  return (
    <div className="p-4 rounded-xl border border-gray-800 bg-[#0f1318]">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-white">{order.ticker}</span>
          <SideText side={order.side} />
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            {order.type}
          </span>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
        <span>
          Qtd: <span className="text-white font-semibold tabular-nums">{order.quantity}</span>
          {showPrice && (
            <>
              {" "}
              · Preço:{" "}
              <span className="text-white font-semibold tabular-nums">
                {order.price}
              </span>
            </>
          )}
          {order.avgPrice !== null && (
            <>
              {" "}
              · PM:{" "}
              <span className="text-white font-semibold tabular-nums">
                {order.avgPrice}
              </span>
            </>
          )}
        </span>
        <span title={order.createdAt}>{formatDate(order.createdAt)}</span>
      </div>
    </div>
  );
}

export function Orders() {
  const { data, error, isLoading, refetch } = useOrders();
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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-xl font-bold text-white">Ordens indisponíveis</h2>
        <p className="text-sm text-gray-400 text-center max-w-md">
          É necessário estar autenticado para visualizar e criar ordens.
        </p>
        <Link
          to="/login"
          className="px-4 py-2 rounded-xl bg-brand-primary text-black text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Fazer login
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-xl font-bold text-white">
          Não foi possível carregar as ordens
        </h2>
        <p className="text-sm text-gray-400 text-center max-w-md">
          {error.message}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-brand-primary text-black text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-white mb-1">Ordens</h2>
        <p className="text-gray-400 text-sm">
          Envie e acompanhe suas ordens de compra e venda.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 p-6 rounded-2xl border border-gray-800 bg-[#161b22] flex flex-col gap-5"
        >
          <h3 className="text-base font-bold text-white">Nova Ordem</h3>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="ex.: PETR4"
              className="w-full px-4 py-3 rounded-xl bg-[#0f1318] border border-gray-700 text-white placeholder-gray-600 text-base focus:outline-none focus:border-brand-primary transition-colors duration-200 uppercase"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Lado</label>
            <div className="grid grid-cols-2 gap-2">
              {SIDE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSide(option.value)}
                  className={`py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                    side === option.value
                      ? option.value === "BUY"
                        ? "bg-brand-primary text-black border-brand-primary"
                        : "bg-red-500 text-white border-red-500"
                      : "bg-[#0f1318] text-gray-400 border-gray-700 hover:border-gray-500"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as OrderType)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f1318] border border-gray-700 text-white text-base focus:outline-none focus:border-brand-primary transition-colors duration-200 cursor-pointer"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#0f1318]">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Quantidade</label>
            <input
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => handleNumeric(e, setQuantity)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl bg-[#0f1318] border border-gray-700 text-white placeholder-gray-600 text-base focus:outline-none focus:border-brand-primary transition-colors duration-200"
            />
          </div>

          {needsPrice && (
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">Preço</label>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => handleNumeric(e, setPrice)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl bg-[#0f1318] border border-gray-700 text-white placeholder-gray-600 text-base focus:outline-none focus:border-brand-primary transition-colors duration-200"
              />
            </div>
          )}

          {createOrder.error && (
            <p className="text-xs text-red-500">{createOrder.error.message}</p>
          )}

          <button
            type="submit"
            disabled={createOrder.isPending}
            className="w-full py-3 rounded-xl bg-brand-primary hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-white font-bold text-sm cursor-pointer"
          >
            {createOrder.isPending ? "Enviando..." : "Enviar Ordem"}
          </button>
        </form>

        <div className="lg:col-span-3 p-6 rounded-2xl border border-gray-800 bg-[#161b22] flex flex-col gap-4">
          <h3 className="text-base font-bold text-white">
            Histórico de Ordens
          </h3>

          {orders.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-16">
              Nenhuma ordem registrada ainda.
            </p>
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
