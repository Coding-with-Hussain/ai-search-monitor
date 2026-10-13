import { and, count, desc, eq, sql } from "drizzle-orm";
import { ListPlus, Radar } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/app/empty-state";
import type { VisibilityPoint } from "@/components/dashboard/visibility-chart";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ProductTour } from "@/components/overview/product-tour";
import { ProjectOverview } from "@/components/overview/project-overview";
import { RetryButton } from "@/components/overview/retry-button";
import { ScanAttemptAlert, type LatestAttempt } from "@/components/overview/scan-alerts";
import type { ProjectOverviewData, ProviderUnavailableReason, RecommendationPreviewItem } from "@/components/overview/types";
import { db } from "@/db";
import { getProfile } from "@/db/repositories/profiles";
import { type AuthorizedProject, getProjectForUser, listCompetitors } from "@/db/repositories/projects";
import { countActiveQueries } from "@/db/repositories/queries";
import { getLatestCompletedScan, getMostRecentScan, getPreviousCompletedScan, getScoreHistory } from "@/db/repositories/scans";
import { recommendations } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { providerStatuses } from "@/services/ai/providers/registry";
import { PROVIDER_IDS, type ProviderId, type ScanMetrics } from "@/types/domain";

export const metadata: Metadata = { title: "Overview" };

const PREVIEW_LIMIT = 3;

/** Top open recommendations: high > medium > low, then most recently updated. */
async function getRecommendationPreview(project: AuthorizedProject): Promise<{ items: RecommendationPreviewItem[]; total: number }> {
  const scope = and(eq(recommendations.projectId, project.id), eq(recommendations.status, "open"));
  const priorityRank = sql`case ${recommendations.priority} when 'high' then 0 when 'medium' then 1 else 2 end`;
  const [rows, totals] = await Promise.all([
    db()
      .select({
        id: recommendations.id,
        title: recommendations.title,
        reason: recommendations.reason,
        priority: recommendations.priority,
        category: recommendations.category,
      })
      .from(recommendations)
      .where(scope)
      .orderBy(priorityRank, desc(recommendations.updatedAt))
      .limit(PREVIEW_LIMIT),
    db().select({ value: count() }).from(recommendations).where(scope),
  ]);
  return { items: rows, total: totals[0]?.value ?? 0 };
}

function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

/** Explain unavailable providers in live scans ("API configuration is missing"). */
function unavailableReasons(metrics: ScanMetrics, mode: "live" | "mock") {
  const reasons: Partial<Record<ProviderId, ProviderUnavailableReason>> = {};
  if (metrics.unavailableProviders.length === 0) return reasons;
  let configured: Map<ProviderId, boolean> | null = null;
  if (mode === "live") {
    try {
      configured = new Map(providerStatuses().map((s) => [s.id, s.configured]));
    } catch (error) {
      logger.warn("overview.provider_status_failed", { error: (error as Error).message });
    }
  }
  for (const id of metrics.unavailableProviders) {
    reasons[id] = configured?.get(id) === false ? "not_configured" : "no_results";
  }
  return reasons;
}

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await getProjectForUser(user.id, projectId).catch((error) => {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  const [latest, mostRecent, competitors, activeQueries, profile] = await Promise.all([
    getLatestCompletedScan(project),
    getMostRecentScan(project),
    listCompetitors(project),
    countActiveQueries(project),
    getProfile(user.id),
  ]);

  // The latest attempt matters only when it is newer than the results shown.
  const attempt: LatestAttempt | null =
    mostRecent && mostRecent.status !== "completed" && (!latest || mostRecent.createdAt > latest.createdAt)
      ? { status: mostRecent.status, error: mostRecent.error, createdAt: mostRecent.createdAt.toISOString() }
      : null;
  const lastCompletedAt = latest ? (latest.completedAt ?? latest.createdAt).toISOString() : null;
  const attemptAlert = <ScanAttemptAlert attempt={attempt} lastCompletedAt={lastCompletedAt} />;

  if (!latest) {
    const running = attempt?.status === "queued" || attempt?.status === "running";
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {attemptAlert}
        <EmptyState
          icon={Radar}
          title="No AI scan has been completed yet."
          description={
            running
              ? "Your first scan is running. We're asking AI assistants your buyer questions; results appear here when it completes."
              : activeQueries === 0
                ? "Add or generate the buyer questions to monitor first. Then use the Run scan button above to check how AI assistants answer them."
                : `Use the Run scan button above to ask AI assistants your ${activeQueries} monitored ${activeQueries === 1 ? "question" : "questions"} and see whether they mention and recommend ${project.name}.`
          }
          action={
            activeQueries === 0 ? (
              <Button asChild>
                <Link href={`/projects/${project.id}/queries`}>
                  <ListPlus aria-hidden="true" />
                  Generate questions
                </Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const metrics = latest.metrics;
  if (!metrics) {
    logger.error("overview.metrics_missing", { projectId: project.id, scanId: latest.id });
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {attemptAlert}
        <Alert variant="danger" title="We couldn't load your latest results" action={<RetryButton />}>
          The results of your latest scan are unavailable right now. Try again, or run a new scan with the button above.
        </Alert>
      </div>
    );
  }

  // Secondary data degrades gracefully: a failure here should not hide the score.
  const [previousScan, history, recommendationPreview] = await Promise.all([
    getPreviousCompletedScan(project, latest.createdAt).catch((error) => {
      logger.warn("overview.previous_failed", { projectId: project.id, error: (error as Error).message });
      return null;
    }),
    getScoreHistory(project, { limit: 120 }).catch((error) => {
      logger.warn("overview.history_failed", { projectId: project.id, error: (error as Error).message });
      return null;
    }),
    getRecommendationPreview(project).catch((error) => {
      logger.warn("overview.recommendations_failed", { projectId: project.id, error: (error as Error).message });
      return null;
    }),
  ]);

  const points: VisibilityPoint[] = (history ?? []).map((h) => ({
    date: h.date,
    score: h.score,
    chatgpt: h.providers.chatgpt ?? null,
    gemini: h.providers.gemini ?? null,
    perplexity: h.providers.perplexity ?? null,
  }));

  const data: ProjectOverviewData = {
    mode: "project",
    projectId: project.id,
    businessName: project.name,
    metrics,
    previous: previousScan?.metrics ?? null,
    scannedAt: lastCompletedAt ?? latest.createdAt.toISOString(),
    history: points,
    historyIncludesSimulation: (history ?? []).some((h) => h.mode === "mock"),
    monitoredProviders: project.providers.filter(isProviderId),
    competitorOrder: competitors.map((c) => c.id),
    recommendations: recommendationPreview?.items ?? null,
    recommendationCount: recommendationPreview?.total ?? 0,
    isSimulation: latest.mode === "mock",
    isDemoData: project.isDemo,
    unavailableReasons: unavailableReasons(metrics, latest.mode),
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {attemptAlert}
      {history === null && (
        <Alert variant="warning" title="Some sections could not be loaded" action={<RetryButton />}>
          Your score history is temporarily unavailable. The latest results below are complete.
        </Alert>
      )}
      <ProjectOverview data={data} />
      <ProductTour enabled={!profile?.tourCompletedAt} />
    </div>
  );
}
