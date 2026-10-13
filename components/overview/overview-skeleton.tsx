import { MetricCardSkeleton } from "@/components/dashboard/metric-card";
import { VisibilityChartSkeleton } from "@/components/dashboard/visibility-chart";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <Card className={className}>
      <div className="space-y-2 p-5 pb-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
      <div className="space-y-3 px-5 pb-5">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </Card>
  );
}

/** Placeholder matching the overview layout while data loads. */
export function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6" role="status" aria-label="Loading overview">
      <Card className="grid overflow-hidden lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:p-6">
          <Skeleton className="size-[152px] shrink-0 rounded-full" />
          <div className="w-full flex-1 space-y-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-full max-w-sm" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="space-y-3 border-t border-border bg-surface-muted/40 p-5 sm:p-6 lg:border-t-0 lg:border-l">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-full max-w-xs" />
          <Skeleton className="h-8 w-24" />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {Array.from({ length: 6 }, (_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
        <div className="col-span-2">
          <MetricCardSkeleton />
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="space-y-3 p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <Skeleton className="mb-4 h-4 w-40" />
          <VisibilityChartSkeleton />
        </Card>
        <CardSkeleton rows={3} />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <CardSkeleton rows={4} className="lg:col-span-2" />
        <CardSkeleton rows={4} />
      </div>
      <span className="sr-only">Loading your AI visibility overview…</span>
    </div>
  );
}
