import { Skeleton } from "@/components/ui/skeleton";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Mesma forma do Painel carregado: faixa de KPIs e, abaixo, gráfico + lista de ativos.
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 flex-1 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={cn(cardClassName, "space-y-3")}
          >
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 nav:grid-cols-3 gap-6 items-stretch flex-1 min-h-0">
        <div className={cn(cardClassName, "nav:col-span-2 flex flex-col min-h-0")}>
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-48 w-full flex-1 rounded-xl" />
        </div>

        <div className={cn(cardClassName, "space-y-4")}>
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
