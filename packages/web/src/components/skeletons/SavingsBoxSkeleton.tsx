import { Skeleton } from "@/components/ui/skeleton";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Mesma grade da página da Caixinha: Resumo na largura toda; "Quanto rende" e "Como funciona" abaixo.
export function SavingsBoxSkeleton() {
  return (
    <div className="grid grid-cols-1 nav:grid-cols-5 gap-4 items-start">
      <div className={cn(cardClassName, "nav:col-span-5 space-y-5")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Skeleton className="h-11 rounded-xl sm:w-28" />
            <Skeleton className="h-11 rounded-xl sm:w-28" />
          </div>
        </div>
        <div className="space-y-3 border-t border-border pt-5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className={cn(cardClassName, "nav:col-span-3 space-y-5")}>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-11 rounded-xl" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-2 w-11/12 rounded-full" />
      </div>
      <div className={cn(cardClassName, "nav:col-span-2 space-y-3")}>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-4/5" />
      </div>
    </div>
  );
}
