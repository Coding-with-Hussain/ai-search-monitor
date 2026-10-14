"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProjectForUser } from "@/db/repositories/projects";
import { createReport, deleteReport } from "@/db/repositories/reports";
import { runAction } from "@/lib/action-utils";
import { track } from "@/lib/analytics/server";
import { requireUserOrThrow } from "@/lib/auth/session";
import { assertActive, getEntitlements } from "@/lib/billing/entitlements";
import { logger } from "@/lib/logger";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { buildReportSnapshot, reportTitle } from "@/services/reports/build";

const generateInput = z.object({ projectId: z.uuid("Invalid project.") });

/**
 * Generate a point-in-time report from the latest completed scan. Requires
 * an active subscription and a completed scan; rate limited per user.
 */
export async function generateReportAction(input: z.input<typeof generateInput>) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const { projectId } = generateInput.parse(input);
    const project = await getProjectForUser(user.id, projectId);
    const ent = await getEntitlements(user.id);
    assertActive(ent);
    await enforceRateLimit(
      `report:${user.id}`,
      RATE_LIMITS.generateReport.limit,
      RATE_LIMITS.generateReport.windowSeconds,
      "You've generated a lot of reports recently. Please try again in a little while.",
    );

    const snapshot = await buildReportSnapshot({ project, userId: user.id, entitlements: ent });
    const report = await createReport(project, {
      userId: user.id,
      title: reportTitle(snapshot),
      snapshot,
      periodStart: snapshot.period.start ? new Date(snapshot.period.start) : null,
      periodEnd: new Date(snapshot.period.end),
    });

    logger.info("report.generated", { projectId: project.id, reportId: report.id, scanId: snapshot.scanId });
    await track("report_generated", user.id, {
      projectId: project.id,
      reportId: report.id,
      isSimulation: snapshot.isSimulation,
      whiteLabel: snapshot.whiteLabel !== null,
    });
    revalidatePath(`/projects/${project.id}/reports`);
    return { reportId: report.id, title: report.title };
  }, "reports.generate");
}

const deleteInput = z.object({ projectId: z.uuid("Invalid project."), reportId: z.uuid("Invalid report.") });

/** Delete a stored report (usage already recorded for it is kept). */
export async function deleteReportAction(input: z.input<typeof deleteInput>) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const data = deleteInput.parse(input);
    const project = await getProjectForUser(user.id, data.projectId);
    const deleted = await deleteReport(project, data.reportId);
    logger.info("report.deleted", { projectId: project.id, reportId: deleted.id });
    revalidatePath(`/projects/${project.id}/reports`);
    revalidatePath(`/projects/${project.id}/reports/${deleted.id}`);
    return { id: deleted.id };
  }, "reports.delete");
}
