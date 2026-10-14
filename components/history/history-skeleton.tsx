import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for the History list (also shown while a scan detail page loads). */
export function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6" role="status">
      <span className="sr-only">Loading scan history…</span>
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Card className="p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-3.5 w-64" />
        <Skeleton className="mt-5 h-7 w-64 rounded-lg" />
        <Skeleton className="mt-4 h-[260px] w-full rounded-lg" />
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-border p-5">
          <Skeleton className="h-4 w-24" />
        </div>
        <ul className="divide-y divide-border">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="ml-auto h-4 w-12" />
              <Skeleton className="hidden h-4 w-16 sm:block" />
              <Skeleton className="hidden h-4 w-24 md:block" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
