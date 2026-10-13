import { AsideCardSkeleton, PageHeaderSkeleton, ProjectCardSkeleton } from "@/components/account/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading dashboard">
      <PageHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <Skeleton className="mb-3 h-5 w-24" />
          <div className="grid gap-4 sm:grid-cols-2">
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <AsideCardSkeleton rows={2} />
          <AsideCardSkeleton rows={3} />
        </div>
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}
