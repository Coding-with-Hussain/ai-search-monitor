import { and, asc, desc, eq, gte, inArray, isNotNull, lte, notExists, sql } from "drizzle-orm";

import { db } from "@/db";
import { type AuthorizedProject, computeNextScanAt } from "@/db/repositories/projects";
import { notifications, profiles, projects, recommendations, scans } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { weeklyReportEmail } from "@/lib/email/templates";
import { getEntitlements } from "@/lib/billing/entitlements";
import { appUrl } from "@/lib/env";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { providerName } from "@/lib/providers-meta";
import { createScan, findScansNeedingWork, processScan } from "@/services/scans/pipeline";

/**
 * Scheduling: create scans for projects whose `next_scan_at` is due, and
 * resume any queued/stalled scans. Called by the cron route (Vercel Cron or
 * any scheduler) and by the optional Inngest cron functions.
 */

export async function enqueueDueScans(limit = 25): Promise<string[]> {
  const now = new Date();
  const due = await db()
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.monitoringEnabled, true),
        isNotNull(projects.nextScanAt),
        lte(projects.nextScanAt, now),
        notExists(
          db()
            .select({ one: sql`1` })
            .from(scans)
            .where(and(eq(scans.projectId, projects.id), inArray(scans.status, ["queued", "running"]))),
        ),
      ),
    )
    .orderBy(asc(projects.nextScanAt))
    .limit(limit);

  const created: string[] = [];
  for (const due0 of due as AuthorizedProject[]) {
    let p = due0;
    try {
      // The plan may have changed since the schedule was set (e.g. a downgrade
      // from Pro): fall back to the closest schedule the plan includes.
      const allowed = (await getEntitlements(p.userId)).plan.limits.monitoringFrequencies;
      if (!allowed.includes(p.monitoringFrequency)) {
        const fallback = (["weekly", "monthly"] as const).find((f) => allowed.includes(f)) ?? "manual";
        const nextScanAt = computeNextScanAt(fallback, p.lastScanAt ?? now);
        await db()
          .update(projects)
          .set({ monitoringFrequency: fallback, monitoringEnabled: fallback !== "manual", nextScanAt })
          .where(eq(projects.id, p.id));
        await db().insert(notifications).values({
          userId: p.userId,
          projectId: p.id,
          type: "monitoring_schedule_changed",
          severity: "info",
          title: `${p.name} now scans ${fallback}`,
          body: `Your current plan includes ${fallback} monitoring, so the ${p.monitoringFrequency} schedule was changed. Upgrade to Pro to monitor daily again.`,
        });
        logger.info("scheduler.frequency_clamped", { projectId: p.id, from: p.monitoringFrequency, to: fallback });
        if (!nextScanAt || nextScanAt > now) continue;
        p = { ...p, monitoringFrequency: fallback };
      }

      const scan = await createScan({ project: p, userId: p.userId, trigger: "scheduled" });
      created.push(scan.id);
    } catch (error) {
      const message = isAppError(error) ? error.message : (error as Error).message;
      if (isAppError(error) && error.code === "CONFLICT") continue; // already running
      logger.warn("scheduler.scan_skipped", { projectId: p.id, error: message });
      // Push the schedule forward so we don't retry every tick, and tell the user.
      await db()
        .update(projects)
        .set({ nextScanAt: computeNextScanAt(p.monitoringFrequency, now) })
        .where(eq(projects.id, p.id));
      if (isAppError(error) && (error.code === "PLAN_LIMIT" || error.code === "SUBSCRIPTION_INACTIVE")) {
        await db().insert(notifications).values({
          userId: p.userId,
          projectId: p.id,
          type: "scheduled_scan_skipped",
          severity: "warning",
          title: "Scheduled scan skipped",
          body: message,
        });
      }
    }
  }
  if (created.length) logger.info("scheduler.enqueued", { count: created.length });
  return created;
}

/** Work through queued / stalled scans until the deadline. */
export async function processPendingScans(deadlineMs = 50_000) {
  const deadline = Date.now() + deadlineMs;
  const processed: string[] = [];
  const finished = new Set<string>();
  while (Date.now() < deadline - 2_000) {
    // Never spin on a scan this invocation already finished with.
    const pending = (await findScansNeedingWork(3 + finished.size)).filter(({ id }) => !finished.has(id)).slice(0, 3);
    if (pending.length === 0) break;
    for (const { id } of pending) {
      const remaining = deadline - Date.now();
      if (remaining < 3_000) break;
      const { done } = await processScan(id, { deadlineMs: remaining - 2_000 });
      if (done) finished.add(id);
      processed.push(id);
    }
  }
  return processed;
}

/**
 * Weekly email summary for each user with recent completed scans and the
 * `weeklyReport` preference enabled. Idempotent per week via a
 * `weekly_report` notification marker.
 */
export async function sendWeeklyReports(limit = 200) {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000);

  const rows = await db()
    .select({ project: projects, email: profiles.email, prefs: profiles.notificationPreferences })
    .from(projects)
    .innerJoin(profiles, eq(profiles.id, projects.userId))
    .where(and(isNotNull(projects.latestScanId), gte(projects.lastScanAt, weekAgo)))
    .limit(limit);

  let sent = 0;
  for (const { project, email, prefs } of rows) {
    if (prefs?.weeklyReport === false || !email) continue;
    const already = await db()
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.projectId, project.id), eq(notifications.type, "weekly_report"), gte(notifications.createdAt, sixDaysAgo)))
      .limit(1);
    if (already.length) continue;

    const [latest] = await db().select().from(scans).where(eq(scans.id, project.latestScanId!)).limit(1);
    if (!latest?.metrics) continue;
    const [topRec] = await db()
      .select()
      .from(recommendations)
      .where(and(eq(recommendations.projectId, project.id), eq(recommendations.status, "open")))
      .orderBy(sql`case ${recommendations.priority} when 'high' then 0 when 'medium' then 1 else 2 end`, desc(recommendations.updatedAt))
      .limit(1);

    const m = latest.metrics;
    const bestProvider = [...m.providers].filter((p) => p.status !== "unavailable").sort((a, b) => b.score - a.score)[0];
    const weakestCategory = [...m.categories].sort((a, b) => a.mentionRate - b.mentionRate)[0];
    const content = weeklyReportEmail({
      projectName: project.name,
      score: m.overall.score,
      previousScore: project.previousScore,
      topImprovement: bestProvider ? `Strongest platform: ${providerName(bestProvider.provider)} (${Math.round(bestProvider.score)}/100).` : null,
      topProblem: weakestCategory
        ? `Low visibility for ${weakestCategory.label.toLowerCase()} questions (${Math.round(weakestCategory.mentionRate)}% mention rate).`
        : null,
      topRecommendation: topRec?.title ?? null,
      dashboardUrl: appUrl(`/projects/${project.id}`),
      isSimulation: latest.mode === "mock",
    });
    await sendEmail({ to: email, ...content });
    await db().insert(notifications).values({
      userId: project.userId,
      projectId: project.id,
      type: "weekly_report",
      severity: "info",
      title: "Your AI visibility report is ready",
      body: `${project.name}: ${Math.round(m.overall.score)}/100 this week.`,
    });
    sent++;
  }
  logger.info("scheduler.weekly_reports", { sent });
  return sent;
}
