import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder matching the question detail layout. */
export function QueryDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6" role="status" aria-label="Loading question details">
      <Skeleton className="h-8 w-32" />
      <Card className="space-y-3 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-full max-w-xl" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-14" />
        </div>
        <div className="flex justify-between border-t border-border pt-4">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="hidden h-8 w-56 sm:block" />
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="space-y-4 p-5">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }, (_, j) => (
                <Skeleton key={j} className="h-9" />
              ))}
            </div>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-9 w-full" />
          </Card>
        ))}
      </div>
      <Card className="space-y-3 p-5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="h-4 w-full max-w-md" />
      </Card>
      <span className="sr-only">Loading question details…</span>
    </div>
  );
}
