import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for the Reports list (also shown briefly while a report opens). */
export function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6" role="status">
      <span className="sr-only">Loading reports…</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
      <Card className="p-5">
        <Skeleton className="h-4 w-48" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-border p-5">
          <Skeleton className="h-4 w-36" />
        </div>
        <ul className="divide-y divide-border">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="hidden h-4 w-32 md:block" />
              <Skeleton className="ml-auto h-4 w-10" />
              <Skeleton className="hidden h-4 w-28 md:block" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
