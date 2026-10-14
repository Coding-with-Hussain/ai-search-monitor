import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/app/empty-state";
import { SimulationBadge } from "@/components/app/simulation-badge";
import { ShareOfVoice } from "@/components/dashboard/share-of-voice";
import { CompetitorComparisonDetails } from "@/components/history/competitor-comparison-details";
import { comparisonEntities, competitorColorOrder } from "@/components/history/comparison";
import { InsightsList } from "@/components/history/insights-list";
import { historyCutoff, TRIGGER_LABEL } from "@/components/history/labels";
import { MetricTiles } from "@/components/history/metric-tiles";
import { Panel } from "@/components/history/panel";
import { PlatformScores } from "@/components/history/platform-scores";
import { RetryButton } from "@/components/history/retry-button";
import { ScanFacts } from "@/components/history/scan-facts";
import { ScanQuestions } from "@/components/history/scan-questions";
import { ScanStatusBadge } from "@/components/history/scan-status-badge";
import { ScoreSummary } from "@/components/history/score-summary";
import { SectionHeader } from "@/components/history/section-header";
import { UpgradeLink } from "@/components/history/upgrade-link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProjectForUser, listCompetitors } from "@/db/repositories/projects";
import { getPreviousCompletedScan, getScanForProject } from "@/db/repositories/scans";
import type { Scan } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import { isAppError } from "@/lib/errors";
import { formatDate, formatNumber, pluralize } from "@/lib/format";
import { logger } from "@/lib/logger";
import { computeScanInsights } from "@/services/reports/insights";

export const metadata: Metadata = { title: "Scan details" };

function NotesList({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <Panel title="Scan notes" description="Messages recorded while this scan ran.">
      <ul className="space-y-2">
        {notes.map((note, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-border-strong" aria-hidden="true" />
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function StatusAlert({ scan }: { scan: Scan }) {
  if (scan.status === "failed") {
    return (
      <Alert variant="danger" title="This scan failed">
        <p>{scan.error ?? "The scan could not be completed."}</p>
        <p className="mt-1 tabular">
          {formatNumber(scan.completedItems)} of {formatNumber(scan.totalItems)} AI answers were collected and{" "}
          {pluralize(scan.failedItems, "check")} failed. No score was recorded, so your history and dashboard still show the
          previous completed scan.
        </p>
      </Alert>
    );
  }
  if (scan.status === "cancelled") {
    return (
      <Alert variant="neutral" title="This scan was cancelled">
        {formatNumber(scan.completedItems)} of {formatNumber(scan.totalItems)} AI answers were collected before it stopped. No
        score was recorded.
      </Alert>
    );
  }
  if (scan.status === "queued" || scan.status === "running") {
    return (
      <Alert variant="info" title={scan.status === "queued" ? "This scan is queued" : "This scan is running"}>
        {formatNumber(scan.completedItems)} of {formatNumber(scan.totalItems)} AI answers collected so far. Progress is shown
        next to the Run scan button above; results appear here when it completes.
      </Alert>
    );
  }
  return null;
}

export default async function ScanDetailPage({ params }: { params: Promise<{ projectId: string; scanId: string }> }) {
  const user = await requireUser();
  const { projectId, scanId } = await params;
  const project = await getProjectForUser(user.id, projectId).catch((error) => {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  const scan = await getScanForProject(project, scanId).catch((error) => {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  const historyPath = `/projects/${project.id}/history`;
  const date = scan.completedAt ?? scan.createdAt;

  const backLink = (
    <Link href={historyPath} className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      Scan history
    </Link>
  );

  const header = (
    <SectionHeader
      title={`Scan on ${formatDate(date)}`}
      meta={
        <>
          <ScanStatusBadge status={scan.status} />
          {scan.mode === "mock" ? <SimulationBadge /> : <Badge variant="outline">Live</Badge>}
          <Badge variant="secondary">{TRIGGER_LABEL[scan.trigger]}</Badge>
          {project.isDemo && <Badge variant="demo">Demo data</Badge>}
        </>
      }
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/${project.id}/queries`}>
            Questions
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      }
    />
  );

  let loaded;
  try {
    const ent = await getEntitlements(user.id);
    const historyDays = ent.plan.limits.historyDays;
    const cutoff = historyCutoff(historyDays);
    const outsideWindow = cutoff !== null && scan.createdAt < cutoff;
    if (outsideWindow) {
      loaded = { outsideWindow, planName: ent.plan.name, historyDays, previous: null, competitors: [] };
    } else {
      const [previous, competitors] = await Promise.all([
        scan.status === "completed" ? getPreviousCompletedScan(project, scan.createdAt) : Promise.resolve(null),
        listCompetitors(project),
      ]);
      loaded = { outsideWindow, planName: ent.plan.name, historyDays, previous, competitors };
    }
  } catch (error) {
    logger.error("history.scan_load_failed", { projectId: project.id, scanId: scan.id, error: (error as Error).message });
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {backLink}
        {header}
        <Alert variant="danger" title="We couldn't load this scan" action={<RetryButton />}>
          Something went wrong while loading the scan details. Please try again.
        </Alert>
      </div>
    );
  }

  if (loaded.outsideWindow) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {backLink}
        <EmptyState
          icon={Lock}
          title="This scan is outside your plan's history"
          description={`Your ${loaded.planName} plan shows scans from the last ${pluralize(loaded.historyDays ?? 0, "day")}. Upgrade to see your full history, including this scan.`}
          action={
            <UpgradeLink source="history_scan_locked" variant="default" size="default">
              Upgrade to see your full history
            </UpgradeLink>
          }
        />
      </div>
    );
  }

  const { previous, competitors } = loaded;
  const metrics = scan.status === "completed" ? scan.metrics : null;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {backLink}
      {header}
      <StatusAlert scan={scan} />
      <ScanFacts scan={{ ...scan, scoringVersion: scan.metrics?.scoringVersion ?? null }} />

      {scan.status === "completed" && !metrics && (
        <Alert variant="danger" title="We couldn't load this scan's results" action={<RetryButton />}>
          The results snapshot for this scan is unavailable right now. Try again, or open a more recent scan.
        </Alert>
      )}

      {metrics && (
        <CompletedScanBody
          projectId={project.id}
          scanId={scan.id}
          businessName={project.name}
          metrics={metrics}
          previous={previous}
          trackedCompetitorIds={competitors.map((c) => c.id)}
        />
      )}

      <NotesList notes={scan.notes} />
    </div>
  );
}

function CompletedScanBody({
  projectId,
  scanId,
  businessName,
  metrics,
  previous,
  trackedCompetitorIds,
}: {
  projectId: string;
  scanId: string;
  businessName: string;
  metrics: NonNullable<Scan["metrics"]>;
  previous: Scan | null;
  trackedCompetitorIds: string[];
}) {
  const previousMetrics = previous?.metrics ?? null;
  const previousScore = previous?.score != null ? Number(previous.score) : null;
  const insights = computeScanInsights(metrics, previousMetrics);
  const entities = comparisonEntities(metrics, businessName);

  return (
    <>
      {metrics.runsFailed > 0 && (
        <Alert variant="warning" title="Some answers could not be collected">
          {pluralize(metrics.runsFailed, "AI answer")} failed in this scan. The score is based on the{" "}
          {formatNumber(metrics.runsSucceeded)} answers that were collected.
        </Alert>
      )}

      <Panel title="Results" description={previous ? `Compared with the scan on ${formatDate(previous.completedAt ?? previous.createdAt)}.` : "The first completed scan for this project."}>
        <ScoreSummary metrics={metrics} previousScore={previousScore} />
        <MetricTiles className="mt-6" overall={metrics.overall} previous={previousMetrics?.overall ?? null} />
      </Panel>

      <Panel title="Top wins and problems" description="Observed signals from the monitored AI answers in this scan.">
        <InsightsList wins={insights.wins} problems={insights.problems} />
      </Panel>

      <Panel title="AI platform scores" description="Your AI Visibility score on each monitored AI platform.">
        <PlatformScores providers={metrics.providers} previous={previousMetrics?.providers ?? null} />
      </Panel>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
        <Panel
          className="lg:col-span-3"
          title="Competitor comparison"
          description="AI Visibility of your business and tracked competitors in the same answers."
        >
          {metrics.competitors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No competitors were tracked in this scan.</p>
          ) : (
            <CompetitorComparisonDetails entities={entities} />
          )}
        </Panel>
        <Panel className="lg:col-span-2" title="Share of voice" description="Who AI assistants recommended across monitored answers.">
          <ShareOfVoice
            slices={metrics.shareOfVoice}
            competitorOrder={competitorColorOrder(trackedCompetitorIds, metrics)}
            businessLabel={`${businessName} (you)`}
          />
        </Panel>
      </div>

      <Panel
        title="Questions in this scan"
        description="Weakest results first. Open a question to see each AI answer from this scan."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/projects/${projectId}/queries`}>
              All questions
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      >
        <ScanQuestions projectId={projectId} scanId={scanId} queries={metrics.queries} />
      </Panel>
    </>
  );
}
