import { Skeleton } from "@/components/ui/skeleton";

// Mesma forma do Painel carregado: faixa de KPIs e, abaixo, gráfico + lista de ativos.
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 flex-1 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-2xl border border-border bg-surface-1 space-y-3"
          >
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 nav:grid-cols-3 gap-6 items-stretch flex-1 min-h-0">
        <div className="nav:col-span-2 p-6 rounded-2xl border border-border bg-surface-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-48 w-full flex-1 rounded-xl" />
        </div>

        <div className="rounded-2xl border border-border bg-surface-1 p-6 space-y-4">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
