import { notFound } from "next/navigation";
import type * as React from "react";

import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectNav } from "@/components/projects/project-nav";
import { ScanControls } from "@/components/projects/scan-controls";
import { getProjectForUser } from "@/db/repositories/projects";
import { countActiveQueries } from "@/db/repositories/queries";
import { getActiveScan } from "@/db/repositories/scans";
import { getEntitlements } from "@/lib/billing/entitlements";
import { requireUser } from "@/lib/auth/session";
import { features } from "@/lib/env";
import { isAppError } from "@/lib/errors";
import type { ScanProgressDto } from "@/lib/scan-progress";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await getProjectForUser(user.id, projectId).catch((error) => {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  const [active, activeQueries, ent] = await Promise.all([getActiveScan(project), countActiveQueries(project), getEntitlements(user.id)]);
  const initialScan: ScanProgressDto | null = active
    ? {
        id: active.id,
        status: active.status,
        mode: active.mode,
        totalItems: active.totalItems,
        completedItems: active.completedItems,
        failedItems: active.failedItems,
        queryCount: active.queryCount,
        providerCount: active.providers.length,
        currentProvider: active.currentProvider,
        currentQuery: active.currentQuery,
        score: active.score,
        error: active.error,
        notes: active.notes,
      }
    : null;

  const disabledReason = !ent.active
    ? (ent.inactiveReason ?? "Your subscription is inactive.")
    : activeQueries === 0
      ? "Add or generate questions before running a scan."
      : null;

  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader
        project={project}
        actions={<ScanControls projectId={project.id} initialScan={initialScan} mockMode={features.mockMode()} disabledReason={disabledReason} />}
      />
      <ProjectNav projectId={project.id} />
      <div>{children}</div>
    </div>
  );
}
