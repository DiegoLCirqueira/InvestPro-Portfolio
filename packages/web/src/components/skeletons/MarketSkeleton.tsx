import { Skeleton } from "@/components/ui/skeleton";

export function MarketSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Skeleton className="h-7 w-52 mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl border border-border space-y-4"
          >
            <Skeleton className="h-3 w-20" />
            <div className="space-y-1">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 p-6 rounded-2xl border border-border flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        <div className="space-y-3">
          <div className="flex gap-4 pb-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20 ml-auto" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-xl bg-secondary/40"
            >
              <div className="space-y-1 min-w-[80px]">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-14" />
              <div className="ml-auto">
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
