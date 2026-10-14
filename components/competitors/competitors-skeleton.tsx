import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder matching the Competitors page layout. */
export function CompetitorsSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6" role="status" aria-label="Loading competitors">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
      <Card className="space-y-5 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <Skeleton className="h-8 w-44" />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </Card>
      <Card className="space-y-4 p-5">
        <Skeleton className="h-4 w-36" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
            <Skeleton className="h-3.5" />
            <Skeleton className="h-5" style={{ width: `${80 - i * 15}%` }} />
          </div>
        ))}
      </Card>
      <span className="sr-only">Loading competitors…</span>
    </div>
  );
}
