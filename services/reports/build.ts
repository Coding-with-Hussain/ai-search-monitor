import "server-only";

import { getProfile } from "@/db/repositories/profiles";
import type { AuthorizedProject } from "@/db/repositories/projects";
import { BASIC_RECOMMENDATIONS_VISIBLE, listTopOpenRecommendations } from "@/db/repositories/recommendations";
import { getLatestCompletedScan, getPreviousCompletedScan, getScoreHistory } from "@/db/repositories/scans";
import { type Entitlements, getEntitlements } from "@/lib/billing/entitlements";
import { validationError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { ReportSnapshot } from "@/types/report";

import { computeScanInsights } from "./insights";

/** Default monitoring window a report covers. */
export const REPORT_PERIOD_DAYS = 30;
/** Recommended actions included in a report (plan gating may lower it). */
export const REPORT_MAX_RECOMMENDATIONS = 8;
/** Upper bound on history points stored in a snapshot. */
const MAX_HISTORY_POINTS = 120;

const DAY_MS = 86_400_000;

export interface BuildReportInput {
  project: AuthorizedProject;
  userId: string;
  /** Days before the latest completed scan the report covers. */
  periodDays?: number;
  /** Pass when already loaded to avoid a second lookup. */
  entitlements?: Entitlements;
}

/**
 * Build a point-in-time report from the latest completed scan: business info,
 * the monitoring period (first to latest completed scan in the window), score
 * history, wins and problems, top open recommendations and white-label
 * branding. Throws a validation error when there is no completed scan yet.
 */
export async function buildReportSnapshot({
  project,
  userId,
  periodDays = REPORT_PERIOD_DAYS,
  entitlements,
}: BuildReportInput): Promise<ReportSnapshot> {
  const latest = await getLatestCompletedScan(project);
  if (!latest || !latest.metrics) {
    throw validationError("Run a scan first. Reports summarize your latest completed AI scan.");
  }

  const ent = entitlements ?? (await getEntitlements(userId));
  const end = latest.completedAt ?? latest.createdAt;
  // Never reach further back than the plan's visible history.
  const historyDays = ent.plan.limits.historyDays;
  const windowDays = historyDays === null ? periodDays : Math.min(periodDays, historyDays);
  const since = new Date(end.getTime() - windowDays * DAY_MS);
  // Basic plans only see their top recommendations; reports must not reveal more.
  const recommendationLimit = ent.plan.features.advancedRecommendations
    ? REPORT_MAX_RECOMMENDATIONS
    : Math.min(REPORT_MAX_RECOMMENDATIONS, BASIC_RECOMMENDATIONS_VISIBLE);

  const [historyRows, previous, recommendations, profile] = await Promise.all([
    getScoreHistory(project, { since, limit: MAX_HISTORY_POINTS }),
    getPreviousCompletedScan(project, latest.createdAt),
    listTopOpenRecommendations(project, recommendationLimit),
    getProfile(userId),
  ]);

  const endIso = end.toISOString();
  const inPeriod = historyRows.filter((h) => h.date <= endIso);
  if (!inPeriod.some((h) => h.scanId === latest.id)) {
    inPeriod.push({ scanId: latest.id, date: endIso, score: Number(latest.score ?? latest.metrics.overall.score), mode: latest.mode, providers: {} });
  }
  const history = inPeriod.map((h) => ({ date: h.date, score: Math.round(h.score * 10) / 10 }));

  const { wins, problems } = computeScanInsights(latest.metrics, previous?.metrics ?? null);
  const company = profile?.company?.trim();
  const location = [project.city, project.country].filter(Boolean).join(", ");

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    business: {
      name: project.name,
      website: project.website ?? (project.domain ? `https://${project.domain}` : null),
      industry: project.industry,
      location: location || null,
    },
    period: { start: history[0]?.date ?? endIso, end: endIso },
    isSimulation: latest.mode === "mock" || inPeriod.some((h) => h.mode === "mock"),
    scanId: latest.id,
    metrics: latest.metrics,
    history,
    previousScore: previous?.score != null ? Number(previous.score) : null,
    wins,
    problems,
    recommendations: recommendations.map((r) => ({ title: r.title, priority: r.priority, action: r.action, reason: r.reason })),
    whiteLabel: ent.plan.features.whiteLabelReports && company ? { brandName: company } : null,
  };
}

/** Title stored with a report, e.g. "AI Visibility Report · October 7, 2026". */
export function reportTitle(snapshot: ReportSnapshot) {
  return `AI Visibility Report · ${formatDate(snapshot.period.end)}`;
}
