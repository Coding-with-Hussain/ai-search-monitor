import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder matching the Questions page layout. */
export function QuestionsSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6" role="status" aria-label="Loading questions">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4 sm:px-5">
          <Skeleton className="h-4 w-56" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
            <Skeleton className="col-span-2 h-8 sm:col-span-3 lg:w-72" />
            <Skeleton className="h-8 lg:w-44" />
            <Skeleton className="h-8 lg:w-44" />
            <Skeleton className="col-span-2 h-8 sm:col-span-1 lg:w-40" />
          </div>
        </div>
        <div className="h-12 border-b border-border bg-surface-muted/50" />
        <ul className="divide-y divide-border">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 px-4 py-4 sm:px-5 lg:grid-cols-[1.25rem_minmax(0,1fr)_6.5rem_14rem_2rem] lg:items-center lg:gap-x-4">
              <Skeleton className="size-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-md" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
              <Skeleton className="hidden h-8 w-full lg:block" />
              <div className="hidden space-y-1.5 lg:block">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-3/5" />
              </div>
              <Skeleton className="hidden size-8 lg:block" />
            </li>
          ))}
        </ul>
      </Card>
      <span className="sr-only">Loading questions…</span>
    </div>
  );
}
