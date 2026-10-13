"use client";

import { usePathname } from "next/navigation";

import { PageHeaderSkeleton, ProjectCardSkeleton, ProjectDetailSkeleton } from "@/components/account/skeletons";

/**
 * This boundary also wraps the nested `/projects/[id]` layout, so render the
 * skeleton that matches where the user is going.
 */
export default function ProjectsLoading() {
  const pathname = usePathname();
  const isList = pathname === "/projects";

  return (
    <div role="status" aria-label={isList ? "Loading projects" : "Loading project"}>
      {isList ? (
        <>
          <PageHeaderSkeleton />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <ProjectCardSkeleton key={i} detailed />
            ))}
          </div>
        </>
      ) : (
        <ProjectDetailSkeleton />
      )}
      <span className="sr-only">{isList ? "Loading projects…" : "Loading project…"}</span>
    </div>
  );
}
