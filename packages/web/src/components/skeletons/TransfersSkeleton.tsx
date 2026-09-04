import { Skeleton } from "@/components/ui/skeleton";

export function TransfersSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="mb-6 shrink-0 space-y-1">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-64" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <div className="p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-5">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        <div className="p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-4">
          <Skeleton className="h-5 w-52" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-2"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
