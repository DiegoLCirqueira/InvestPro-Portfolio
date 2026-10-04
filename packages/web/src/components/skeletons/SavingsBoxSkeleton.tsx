import { Skeleton } from "@/components/ui/skeleton";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Mesmo desenho da página da Caixinha (saldo, rendimento e ações; "Como funciona" ao lado).
export function SavingsBoxSkeleton() {
  return (
    <div className="grid grid-cols-1 nav:grid-cols-5 gap-4 items-start">
      <div className={cn(cardClassName, "nav:col-span-3 space-y-5")}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-11 rounded-xl" />
        </div>
        <Skeleton className="h-4 w-64" />
      </div>
      <div className={cn(cardClassName, "nav:col-span-2 space-y-3")}>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}
