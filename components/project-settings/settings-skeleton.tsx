import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({ fields }: { fields: number }) {
  return (
    <div className="grid gap-5 rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-10">
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-full max-w-56" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder matching the project settings layout (for a settings loading.tsx). */
export function ProjectSettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6" role="status" aria-label="Loading project settings">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
      <SectionSkeleton fields={6} />
      <SectionSkeleton fields={1} />
      <SectionSkeleton fields={1} />
      <SectionSkeleton fields={2} />
      <span className="sr-only">Loading project settings…</span>
    </div>
  );
}
