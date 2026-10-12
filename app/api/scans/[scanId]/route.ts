import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { getProjectForUser } from "@/db/repositories/projects";
import { getScanProgress } from "@/db/repositories/scans";
import { scans } from "@/db/schema";
import { errorResponse } from "@/lib/action-utils";
import { requireUserOrThrow } from "@/lib/auth/session";
import { notFound } from "@/lib/errors";
import type { ScanProgressDto } from "@/lib/scan-progress";

export const dynamic = "force-dynamic";

/** Poll scan progress. Ownership is verified through the scan's project. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ scanId: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { scanId } = await ctx.params;
    if (!z.uuid().safeParse(scanId).success) throw notFound("Scan not found.");
    const [row] = await db().select({ projectId: scans.projectId }).from(scans).where(and(eq(scans.id, scanId))).limit(1);
    if (!row) throw notFound("Scan not found.");
    const project = await getProjectForUser(user.id, row.projectId);
    const s = await getScanProgress(project, scanId);
    const body: ScanProgressDto = {
      id: s.id,
      status: s.status,
      mode: s.mode,
      totalItems: s.totalItems,
      completedItems: s.completedItems,
      failedItems: s.failedItems,
      queryCount: s.queryCount,
      providerCount: s.providers.length,
      currentProvider: s.currentProvider,
      currentQuery: s.currentQuery,
      score: s.score,
      error: s.error,
      notes: s.notes,
    };
    return Response.json(body, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "scan.progress");
  }
}
