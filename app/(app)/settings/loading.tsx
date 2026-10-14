import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading settings…</span>
      <div className="mb-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <div className="flex gap-1 overflow-hidden lg:flex-col">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-28 shrink-0 rounded-lg lg:w-full" />
          ))}
        </div>
        <div className="flex flex-col gap-6">
          <SectionSkeleton />
          <SectionSkeleton rows={3} />
          <SectionSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}
