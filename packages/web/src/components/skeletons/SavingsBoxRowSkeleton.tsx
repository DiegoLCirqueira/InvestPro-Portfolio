import { Skeleton } from "@/components/ui/skeleton";

// Mesmo desenho da linha da Caixinha (ícone, nome, valor, duas ações e separador), para o
// topo de "Seus Ativos" não pular quando os dados chegam.
export function SavingsBoxRowSkeleton() {
  return (
    <div className="mb-4 border-b border-border pb-4">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
        <Skeleton className="h-3.5 w-20" />
      </div>
      <div className="grid grid-cols-2 gap-2 px-3">
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
      </div>
    </div>
  );
}
