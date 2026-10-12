"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProjectForUser } from "@/db/repositories/projects";
import { runAction } from "@/lib/action-utils";
import { track } from "@/lib/analytics/server";
import { requireUserOrThrow } from "@/lib/auth/session";
import { features } from "@/lib/env";
import { validationError } from "@/lib/errors";
import { enqueueScan } from "@/lib/jobs/runner";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createScan } from "@/services/scans/pipeline";

const startScanSchema = z.object({
  projectId: z.uuid(),
  /** Simulated scan (no API calls). Allowed in simulation mode or on demo projects. */
  demo: z.boolean().optional(),
});

export async function startScanAction(input: z.input<typeof startScanSchema>) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const { projectId, demo } = startScanSchema.parse(input);
    const project = await getProjectForUser(user.id, projectId);
    await enforceRateLimit(`scan:${user.id}`, RATE_LIMITS.startScan.limit, RATE_LIMITS.startScan.windowSeconds);

    if (demo && !features.mockMode() && !project.isDemo) {
      throw validationError("Demo scans are available in simulation mode or on demo projects.");
    }
    const scan = await createScan({
      project,
      userId: user.id,
      trigger: demo ? "demo" : "manual",
      mode: demo ? "mock" : undefined,
    });
    const driver = await enqueueScan(scan.id);
    await track("scan_started", user.id, { projectId, mode: scan.mode, queries: scan.queryCount, driver });
    revalidatePath(`/projects/${projectId}`, "layout");
    return { scanId: scan.id, mode: scan.mode, totalItems: scan.totalItems, notes: scan.notes };
  }, "scan.start");
}
