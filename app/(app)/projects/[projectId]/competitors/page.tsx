import { ChartColumn } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/app/empty-state";
import { SimulationBadge } from "@/components/app/simulation-badge";
import { CompetitorComparisonSection } from "@/components/competitors/competitor-comparison-section";
import { CompetitorInsights } from "@/components/competitors/competitor-insights";
import { TrackedCompetitors } from "@/components/competitors/tracked-competitors";
import type { ComparisonEntity } from "@/components/dashboard/competitor-comparison";
import { RetryButton } from "@/components/queries/retry-button";
import { SectionHeader } from "@/components/queries/section-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getProjectForUser, listCompetitors } from "@/db/repositories/projects";
import { getLatestCompletedScan } from "@/db/repositories/scans";
import { requireUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import { isAppError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { logger } from "@/lib/logger";
import { type CompetitorInsight, competitorInsight } from "@/services/metrics/competitor-insights";

export const metadata: Metadata = { title: "Competitors" };

export default async function CompetitorsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await getProjectForUser(user.id, projectId).catch((error) => {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  const header = (
    <SectionHeader
      title="Competitors"
      description="See which businesses AI assistants mention and recommend alongside you, or instead of you, in your monitored questions."
    />
  );

  let data;
  try {
    const [competitors, latest, ent] = await Promise.all([
      listCompetitors(project),
      getLatestCompletedScan(project),
      getEntitlements(user.id),
    ]);
    data = { competitors, latest, ent };
  } catch (error) {
    logger.error("competitors.load_failed", { projectId: project.id, error: (error as Error).message });
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {header}
        <Alert variant="danger" title="We couldn't load your competitors" action={<RetryButton />}>
          Something went wrong while loading this page. Please try again.
        </Alert>
      </div>
    );
  }

  const { competitors, latest, ent } = data;
  const metrics = latest?.metrics ?? null;
  const tracked = new Set(competitors.map((c) => c.id));
  // Only competitors that are still tracked (removed ones remain in old snapshots).
  const scanned = metrics ? metrics.competitors.filter((c) => tracked.has(c.competitorId)) : [];
  const metricsById = new Map(scanned.map((c) => [c.competitorId, c.metrics]));
  const entities: ComparisonEntity[] = metrics
    ? [
        { key: "business", name: project.name, isYou: true, metrics: metrics.overall },
        ...scanned.map((c) => ({ key: c.competitorId, name: c.name, isYou: false, metrics: c.metrics })),
      ]
    : [];
  const insights: CompetitorInsight[] = metrics
    ? scanned.map((c) => competitorInsight(metrics, c.competitorId)).filter((i): i is CompetitorInsight => i !== null)
    : [];

  const scanMeta = latest ? (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>Latest scan: {formatDate(latest.completedAt ?? latest.createdAt)}</span>
      {latest.mode === "mock" && <SimulationBadge />}
      {project.isDemo && <Badge variant="demo">Demo data</Badge>}
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {header}
      <TrackedCompetitors
        projectId={project.id}
        competitors={competitors}
        metricsById={metricsById}
        usage={{ used: competitors.length, max: ent.plan.limits.competitorsPerProject, planName: ent.plan.name }}
        inactiveReason={ent.active ? null : (ent.inactiveReason ?? "Your subscription is not active.")}
      />

      {competitors.length > 0 &&
        (!latest ? (
          <EmptyState
            icon={ChartColumn}
            title="Your comparison appears after the first scan"
            description="Run a scan with the button above to see how often AI assistants mention and recommend you compared with these competitors."
          />
        ) : !metrics ? (
          <Alert variant="danger" title="We couldn't load your latest results" action={<RetryButton />}>
            The results of your latest scan are unavailable right now. Try again, or run a new scan with the button above.
          </Alert>
        ) : scanned.length === 0 ? (
          <EmptyState
            icon={ChartColumn}
            title="No data yet — appears after the next scan"
            description="These competitors were added after your latest scan. Run a scan to compare your AI visibility with them."
          />
        ) : (
          <>
            <CompetitorComparisonSection entities={entities} meta={scanMeta} />
            <CompetitorInsights insights={insights} yourScore={metrics.overall.score} />
          </>
        ))}
    </div>
  );
}
