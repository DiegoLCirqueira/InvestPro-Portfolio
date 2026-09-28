import { ClipboardList, LogIn } from "lucide-react";
import { OrdersSkeleton } from "@/components/skeletons/OrdersSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/SectionTitle";
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
      <div className="animate-in fade-in duration-300">
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
    <div className="flex flex-col animate-in fade-in duration-500">
      <PageHeader
        title="Ordens"
        description="Envie e acompanhe suas ordens de compra e venda."
      />

      <div className="grid grid-cols-1 nav:grid-cols-5 gap-4 items-start">
        <NewOrderForm onCreated={() => void refetch()} />

        {/* No desktop o histórico não define a altura da linha (h-0 + min-h-full):
            ela vem do formulário, e o histórico usa essa altura como máximo,
            rolando por dentro quando passa dela. */}
        <div className="nav:col-span-3 nav:self-stretch nav:h-0 nav:min-h-full">
        <div className="nav:max-h-full p-4 sm:p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-4">
          <SectionTitle>Histórico de Ordens</SectionTitle>

          {orders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              message="Você ainda não fez nenhuma ordem. Explore os ativos disponíveis para começar a investir."
              action={{ label: "Ver ativos disponíveis", to: "/market" }}
            />
          ) : (
            <div className="flex flex-col divide-y divide-border nav:min-h-0 nav:overflow-y-auto pr-1 custom-scrollbar">
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      <div className="mt-6">
        <SavingsBoxCard />
      </div>
    </div>
  );
}
