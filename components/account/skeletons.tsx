import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {withAction && <Skeleton className="h-9 w-36 rounded-lg" />}
    </div>
  );
}

export function ProjectCardSkeleton({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-40 max-w-full" />
          <Skeleton className="h-4 w-28" />
          {detailed && (
            <>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </>
          )}
        </div>
        <Skeleton className="size-16 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-4 w-32" />
      <div className={`mt-4 grid gap-3 border-t border-border pt-4 ${detailed ? "grid-cols-3" : "grid-cols-2"}`}>
        {Array.from({ length: detailed ? 3 : 2 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AsideCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-2 h-4 w-48 max-w-full" />
      <div className="mt-5 flex flex-col gap-5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Neutral placeholder for a project detail route (header, section tabs,
 * content). Used while `/projects/[id]/*` loads, since the projects segment's
 * loading boundary also wraps the nested project layout.
 */
export function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-7 w-52" />
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="flex gap-4 overflow-hidden border-b border-border pb-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-20 shrink-0" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-56 w-full" />
      </div>
    </div>
  );
}
