import { and, desc, eq, lt } from "drizzle-orm";

import { db } from "@/db";
import { getProfile } from "@/db/repositories/profiles";
import type { AuthorizedProject } from "@/db/repositories/projects";
import { notifications, type Scan, scans } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { alertEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/env";
import { comparableScans, coverageSentence } from "@/services/scans/coverage";
import type { ScanMetrics } from "@/types/domain";

/**
 * Alert rules evaluated after every completed scan. `computeAlerts` is pure
 * (unit-tested); `evaluateScanAlerts` persists notifications and emails users
 * according to their notification preferences.
 */

export type AlertType = "scan_completed" | "score_change" | "visibility_drop" | "visibility_lost" | "competitor_overtake";

export interface Alert {
  type: AlertType;
  severity: "info" | "success" | "warning" | "critical";
  title: string;
  body: string;
  preference: "scanCompleted" | "scoreChanges" | "visibilityDrops" | "competitorOvertakes";
  email: boolean;
}

export function computeAlerts(input: {
  projectName: string;
  current: ScanMetrics;
  previous: ScanMetrics | null;
  isSimulation: boolean;
}): Alert[] {
  const { current, previous } = input;
  const alerts: Alert[] = [];
  // Everything is compared as displayed (whole-number scores), so an alert
  // never says "fell from 3 to 3" or "45 vs your 45".
  const score = Math.round(current.overall.score);
  const label = input.isSimulation ? " (simulation)" : "";
  const partial = current.coverage ? ` Partial scan: ${coverageSentence(current.coverage)}.` : "";

  alerts.push({
    type: "scan_completed",
    severity: "success",
    title: "AI visibility scan completed",
    body: `${input.projectName} scored ${score}/100 across ${current.runsSucceeded} AI answers${label}.${partial}`,
    preference: "scanCompleted",
    email: false,
  });

  // Scans that checked different question sets are not compared.
  if (!previous || !comparableScans(current, previous)) return alerts;
  const prevScore = Math.round(previous.overall.score);
  const delta = score - prevScore;

  if (previous.overall.mentionRate > 0 && current.overall.mentionRate === 0) {
    alerts.push({
      type: "visibility_lost",
      severity: "critical",
      title: "Your business disappeared from AI answers",
      body: `${input.projectName} was not mentioned in any monitored answer this scan (previously ${Math.round(previous.overall.mentionRate)}%).`,
      preference: "visibilityDrops",
      email: true,
    });
  } else if (prevScore > 0 && delta < 0 && -delta / prevScore >= 0.1) {
    alerts.push({
      type: "visibility_drop",
      severity: "warning",
      title: "AI visibility dropped",
      body: `${input.projectName}'s score fell from ${prevScore} to ${score} (${delta} points).`,
      preference: "visibilityDrops",
      email: true,
    });
  } else if (Math.abs(delta) >= 5) {
    alerts.push({
      type: "score_change",
      severity: delta > 0 ? "success" : "info",
      title: delta > 0 ? "AI visibility improved" : "AI visibility changed",
      body: `${input.projectName}'s score moved from ${prevScore} to ${score} (${delta > 0 ? "+" : ""}${delta} points).`,
      preference: "scoreChanges",
      email: false,
    });
  }

  for (const c of current.competitors) {
    const before = previous.competitors.find((p) => p.competitorId === c.competitorId);
    if (!before) continue;
    const theirs = Math.round(c.metrics.score);
    const wasBehind = Math.round(before.metrics.score) <= prevScore;
    const nowAhead = theirs > score;
    if (wasBehind && nowAhead) {
      alerts.push({
        type: "competitor_overtake",
        severity: "warning",
        title: `${c.name} overtook you`,
        body: `${c.name} now scores ${theirs} vs your ${score} in monitored AI answers.`,
        preference: "competitorOvertakes",
        email: true,
      });
    }
  }
  return alerts;
}

export async function evaluateScanAlerts(input: {
  project: AuthorizedProject;
  scan: Scan;
  metrics: ScanMetrics;
  previousScore: number | null;
}) {
  const { project, scan, metrics } = input;
  const [prev] = await db()
    .select({ metrics: scans.metrics })
    .from(scans)
    .where(and(eq(scans.projectId, project.id), eq(scans.status, "completed"), lt(scans.createdAt, scan.createdAt)))
    .orderBy(desc(scans.createdAt))
    .limit(1);

  const alerts = computeAlerts({
    projectName: project.name,
    current: metrics,
    previous: prev?.metrics ?? null,
    isSimulation: scan.mode === "mock",
  });

  const profile = await getProfile(project.userId);
  const prefs = profile?.notificationPreferences;
  const enabled = alerts.filter((a) => !prefs || prefs[a.preference] !== false);
  if (enabled.length === 0) return;

  await db()
    .insert(notifications)
    .values(
      enabled.map((a) => ({
        userId: project.userId,
        projectId: project.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        body: a.body,
      })),
    );

  if (profile?.email) {
    for (const a of enabled.filter((x) => x.email)) {
      await sendEmail({ to: profile.email, ...alertEmail(project.name, a.title, a.body, appUrl(`/projects/${project.id}`)) });
    }
  }
}
