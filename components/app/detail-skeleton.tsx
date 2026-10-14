import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Generic skeleton for detail pages (scan detail, report). */
export function DetailSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label={label}>
      <Skeleton className="h-4 w-32" />
      <Card className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <Skeleton className="size-36 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-4 w-60 max-w-full" />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="flex flex-col gap-3 p-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <Skeleton className="mb-4 h-5 w-40" />
        <Skeleton className="h-48 w-full" />
      </Card>
      <span className="sr-only">{label}</span>
    </div>
  );
}
