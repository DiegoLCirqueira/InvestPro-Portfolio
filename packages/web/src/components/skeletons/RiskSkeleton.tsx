import { Skeleton } from "@/components/ui/skeleton";

export function RiskSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
      <header className="mb-8 space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </header>

      <div className="p-6 rounded-2xl border border-gray-800 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <div className="h-2 bg-gray-800 rounded-full mb-3 overflow-hidden">
          <Skeleton className="h-full w-1/2 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-gray-800 space-y-3"
          >
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
