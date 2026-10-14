import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading billing details…</span>
      <div className="mb-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
            <Skeleton className="h-9 w-36 rounded-lg" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-60 max-w-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        <div className="mt-8 flex justify-center">
          <Skeleton className="h-10 w-48 rounded-full" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-96 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
