import { ClipboardList, LogIn } from "lucide-react";
import { OrdersSkeleton } from "@/components/skeletons/OrdersSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { NewOrderForm } from "@/components/orders/NewOrderForm";
import { OrderRow } from "@/components/orders/OrderRow";
import { SavingsBoxCard } from "@/components/orders/SavingsBoxCard";
import { useOrders } from "@/hooks/use-orders";
import { ApiError } from "@/services/api";

export function Orders() {
  const { data, error, isLoading, refetch } = useOrders();

  const isUnauthorized = error instanceof ApiError && error.status === 401;

  const orders = [...(data?.items ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

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
        <NewOrderForm onCreated={() => void refetch()} />

        <div className="nav:col-span-3 p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-4">
          <h3 className="text-base font-bold text-foreground">
            Histórico de Ordens
          </h3>

          {orders.length === 0 ? (
            <EmptyState icon={ClipboardList} message="Nenhuma ordem registrada ainda." />
          ) : (
            <div className="flex flex-col gap-3 nav:max-h-[560px] nav:overflow-y-auto pr-1 custom-scrollbar">
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <SavingsBoxCard />
      </div>
    </div>
  );
}
