import { History, ListPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/app/empty-state";
import { SimulationBadge } from "@/components/app/simulation-badge";
import { type VisibilityPoint, VisibilityChart } from "@/components/dashboard/visibility-chart";
import { historyCutoff, shownScoreDiff, TRUST_NOTE } from "@/components/history/labels";
import { Pager, parsePage } from "@/components/history/pager";
import { RetryButton } from "@/components/history/retry-button";
import { type HistoryScanRow, ScanList } from "@/components/history/scan-list";
import { SectionHeader } from "@/components/history/section-header";
import { UpgradeLink } from "@/components/history/upgrade-link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getProjectForUser } from "@/db/repositories/projects";
import { countActiveQueries } from "@/db/repositories/queries";
import { getPreviousCompletedScan, getScoreHistory, listScans, type ScanSummary } from "@/db/repositories/scans";
import { requireUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import { PLAN_IDS, PLANS } from "@/lib/billing/plans";
import { isAppError } from "@/lib/errors";
import { pluralize } from "@/lib/format";
import { logger } from "@/lib/logger";
import { scanCoverage } from "@/services/scans/coverage";
import { PROVIDER_IDS, type ProviderId } from "@/types/domain";

export const metadata: Metadata = { title: "History" };

const PAGE_SIZE = 20;
const CHART_LIMIT = 200;

function scanDate(s: Pick<ScanSummary, "completedAt" | "createdAt">) {
  return (s.completedAt ?? s.createdAt).toISOString();
}

/** Table rows with the change vs the previous completed scan (the next completed row, or `older`). */
function toRows(projectId: string, scans: ScanSummary[], older: { score: number | null; partial: boolean } | null): HistoryScanRow[] {
  return scans.map((s, i) => {
    let baseline: number | null = older?.score ?? null;
    let baselinePartial = older?.partial ?? false;
    for (let j = i + 1; j < scans.length; j++) {
      if (scans[j].status === "completed" && scans[j].score !== null) {
        baseline = Number(scans[j].score);
        baselinePartial = Boolean(scanCoverage(scans[j]));
        break;
      }
    }
    // Scans that checked different question sets are not compared.
    const comparable = !scanCoverage(s) && !baselinePartial;
    const score = s.score === null ? null : Number(s.score);
    const linkable = s.status === "completed" || s.status === "failed" || s.status === "cancelled";
    return {
      id: s.id,
      date: scanDate(s),
      status: s.status,
      trigger: s.trigger,
      mode: s.mode,
      score,
      change: s.status === "completed" && comparable ? shownScoreDiff(score, baseline) : null,
      queryCount: s.queryCount,
      providerCount: s.providers.length,
      failedItems: s.failedItems,
      note: s.status === "failed" && s.error ? s.error : (s.notes[0] ?? null),
      href: linkable ? `/projects/${projectId}/history/${s.id}` : null,
    };
  });
}

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await getProjectForUser(user.id, projectId).catch((error) => {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  const page = parsePage((await searchParams).page);
  const basePath = `/projects/${project.id}/history`;

  const header = (
    <SectionHeader
      title="Scan history"
      description="Every AI scan for this project: its score, what changed since the previous scan, and how many answers were collected."
      meta={project.isDemo ? <Badge variant="demo">Demo data</Badge> : undefined}
    />
  );

  let data;
  try {
    const ent = await getEntitlements(user.id);
    const historyDays = ent.plan.limits.historyDays;
    const since = historyCutoff(historyDays);
    const [pageScans, history, hiddenOlder, activeQueries] = await Promise.all([
      listScans(project, { limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE, since }),
      getScoreHistory(project, { since, limit: CHART_LIMIT }),
      since ? getPreviousCompletedScan(project, since).then(Boolean) : Promise.resolve(false),
      countActiveQueries(project),
    ]);
    const hasNext = pageScans.length > PAGE_SIZE;
    const scans = pageScans.slice(0, PAGE_SIZE);
    // Baseline for the oldest completed scan on this page: the completed scan before it.
    const lastCompleted = [...scans].reverse().find((s) => s.status === "completed");
    const older = lastCompleted ? await getPreviousCompletedScan(project, lastCompleted.createdAt) : null;
    const olderBaseline = older ? { score: older.score === null ? null : Number(older.score), partial: Boolean(scanCoverage(older)) } : null;
    data = { ent, historyDays, scans, hasNext, history, hiddenOlder, activeQueries, olderBaseline };
  } catch (error) {
    logger.error("history.load_failed", { projectId: project.id, error: (error as Error).message });
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {header}
        <Alert variant="danger" title="We couldn't load your scan history" action={<RetryButton />}>
          Something went wrong while loading this page. Please try again.
        </Alert>
      </div>
    );
  }

  const { ent, historyDays, scans, hasNext, history, hiddenOlder, activeQueries, olderBaseline } = data;
  const unlimitedPlan = PLAN_IDS.map((id) => PLANS[id]).find((p) => p.limits.historyDays === null);
  const limitNote =
    hiddenOlder && historyDays !== null ? (
      <Alert
        variant="info"
        title="Upgrade to see your full history"
        action={
          <UpgradeLink source="history_limit" variant="outline">
            See plans
          </UpgradeLink>
        }
      >
        Your {ent.plan.name} plan shows scans from the last {pluralize(historyDays, "day")}. Older scans are kept but hidden
        {unlimitedPlan ? `; the ${unlimitedPlan.name} plan and above include your full history.` : "."}
      </Alert>
    ) : null;

  if (scans.length === 0 && page === 1) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {header}
        {limitNote}
        <EmptyState
          icon={History}
          title={hiddenOlder ? "No scans in your plan's history window" : "No scans yet"}
          description={
            hiddenOlder
              ? "Your recent history is empty. Run a scan with the button above to start a new trend."
              : activeQueries === 0
                ? "Add the buyer questions to monitor, then run your first AI scan. Every scan appears here with its score and changes."
                : "Run your first AI scan with the button above. Every scan appears here with its score and what changed."
          }
          action={
            activeQueries === 0 ? (
              <Button asChild>
                <Link href={`/projects/${project.id}/queries`}>
                  <ListPlus aria-hidden="true" />
                  Add questions
                </Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const points: VisibilityPoint[] = history.map((h) => ({
    date: h.date,
    score: h.score,
    chatgpt: h.providers.chatgpt ?? null,
    gemini: h.providers.gemini ?? null,
    perplexity: h.providers.perplexity ?? null,
  }));
  const chartProviders = PROVIDER_IDS.filter((id: ProviderId) => history.some((h) => h.providers[id] != null));
  const chartSimulated = history.some((h) => h.mode === "mock");
  const rows = toRows(project.id, scans, olderBaseline);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {header}
      {limitNote}

      <Card>
        <section aria-labelledby="score-trend-heading" className="p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 id="score-trend-heading" className="text-[15px] font-semibold tracking-tight">
                AI Visibility over time
              </h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Score of each completed scan{historyDays !== null ? ` in the last ${pluralize(historyDays, "day")}` : ""}.
              </p>
            </div>
            {chartSimulated && <SimulationBadge label="Includes simulated scans" className="self-start" />}
          </div>
          <VisibilityChart points={points} providers={chartProviders} defaultRange="all" />
          <p className="mt-3 text-xs text-subtle-foreground">{TRUST_NOTE}</p>
        </section>
      </Card>

      <Card className="overflow-hidden">
        <section aria-labelledby="scans-heading">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
            <h3 id="scans-heading" className="text-[15px] font-semibold tracking-tight">
              Scans
            </h3>
            <p className="text-xs text-muted-foreground">Newest first</p>
          </div>
          {rows.length > 0 ? (
            <ScanList rows={rows} />
          ) : (
            <div className="p-4 sm:p-5">
              <EmptyState
                icon={History}
                className="py-10"
                title="No scans on this page"
                description="This page is past the end of your history."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href={basePath}>Go to the newest scans</Link>
                  </Button>
                }
              />
            </div>
          )}
          <Pager
            label="Scan history pagination"
            page={page}
            hasNext={hasNext}
            hrefFor={(p) => (p > 1 ? `${basePath}?page=${p}` : basePath)}
          />
        </section>
      </Card>
    </div>
  );
}
