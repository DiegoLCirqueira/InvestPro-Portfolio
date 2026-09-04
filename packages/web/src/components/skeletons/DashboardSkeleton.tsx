import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1 min-h-0">
      <div className="lg:col-span-2 space-y-6 flex flex-col min-h-0">
        <div className="p-6 rounded-2xl border border-border shadow-xl space-y-4">
          <Skeleton className="h-4 w-48" />
          <div className="flex items-end gap-3">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-6 w-16 rounded-lg" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-3 w-40" />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <div className="lg:col-span-1 h-full min-h-0">
        <div className="rounded-2xl border border-border p-6 h-full space-y-4">
          <Skeleton className="h-5 w-28" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-3.5 w-20 ml-auto" />
                  <Skeleton className="h-2.5 w-10 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
