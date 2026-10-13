import { formatNumber } from "@/lib/format";
import type { EntityMetrics, Priority, QuerySummary, ScanMetrics } from "@/types/domain";

import type { ProjectOverviewData } from "./types";

export const NOT_ENOUGH_DATA = "Not enough data to calculate this metric.";
export const TRUST_NOTE = "AI answers can vary between runs. Scores are based on the queries and providers monitored by your account.";
export const METRIC_DISCLAIMER = "This is a proprietary monitoring metric, not a search-engine ranking.";

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export const PRIORITY_LABEL: Record<Priority, string> = { high: "High priority", medium: "Medium priority", low: "Low priority" };
export const PRIORITY_BADGE: Record<Priority, "warning" | "secondary" | "outline"> = {
  high: "warning",
  medium: "secondary",
  low: "outline",
};

/** Link targets. Demo mode sends anything that needs an account to signup. */
export function overviewLinks(data: Pick<ProjectOverviewData, "mode" | "projectId">) {
  const base = data.mode === "project" && data.projectId ? `/projects/${data.projectId}` : null;
  return {
    isDemo: base === null,
    signup: "/signup",
    queries: base ? `${base}/queries` : null,
    providerQueries: (provider: string) => (base ? `${base}/queries?provider=${provider}` : null),
    query: (queryId: string | null) => (base && queryId ? `${base}/queries/${queryId}` : null),
    competitors: base ? `${base}/competitors` : null,
    recommendations: base ? `${base}/recommendations` : null,
    history: base ? `${base}/history` : null,
    settings: base ? `${base}/settings` : null,
  };
}

/** Difference between two numbers, or null when either is missing. */
export function diff(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null) return null;
  return Math.round((current - previous) * 10) / 10;
}

/** Most important monitored questions: high priority first, then weakest results. */
export function topQuestions(queries: QuerySummary[], limit: number): QuerySummary[] {
  return [...queries]
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.score - b.score || a.text.localeCompare(b.text))
    .slice(0, limit);
}

export function questionStatus(q: Pick<QuerySummary, "recommendedIn" | "mentionedIn" | "bestPosition">): {
  label: string;
  tone: "success" | "default" | "secondary";
} {
  if (q.recommendedIn > 0) return { label: q.bestPosition ? `Recommended #${q.bestPosition}` : "Recommended", tone: "success" };
  if (q.mentionedIn > 0) return { label: "Mentioned", tone: "default" };
  return { label: "Not mentioned", tone: "secondary" };
}

/** Questions and platforms behind the latest score, for the "Based on…" line. */
export function coverage(metrics: ScanMetrics) {
  const platforms = metrics.providers.filter((p) => p.status !== "unavailable").length;
  const questions = metrics.queries.length;
  return {
    answers: metrics.runsSucceeded,
    questions,
    platforms,
    text: `Based on ${formatNumber(metrics.runsSucceeded)} monitored AI ${metrics.runsSucceeded === 1 ? "answer" : "answers"} (${formatNumber(
      questions,
    )} ${questions === 1 ? "question" : "questions"} × ${platforms} ${platforms === 1 ? "platform" : "platforms"}).`,
  };
}

/** Sentence describing your position against the strongest competitor. */
export function gapSentence(points: number, competitorName: string) {
  const abs = Math.round(Math.abs(points));
  if (abs === 0) return `You are level with your strongest competitor, ${competitorName}.`;
  return points < 0
    ? `You are ${abs} ${abs === 1 ? "point" : "points"} behind your strongest competitor, ${competitorName}.`
    : `You are ${abs} ${abs === 1 ? "point" : "points"} ahead of your strongest competitor, ${competitorName}.`;
}

export function formatSignedPoints(points: number) {
  const r = Math.round(points);
  return r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : "0";
}

export function hasMetricData(m: EntityMetrics) {
  return m.runs > 0;
}
