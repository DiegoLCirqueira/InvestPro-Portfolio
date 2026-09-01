import { Skeleton } from "@/components/ui/skeleton";

export function NewsSkeleton() {
  return (
    <div className="flex-1">
      <header className="mb-8 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </header>

      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-800/20 border border-gray-800 p-5 rounded-2xl space-y-3"
          >
            <div className="flex justify-between items-start">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3.5 w-16" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
