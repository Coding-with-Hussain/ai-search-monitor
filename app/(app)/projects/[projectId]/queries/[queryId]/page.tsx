import { ArrowLeft, MessageSquareDashed, Pause } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { EmptyState } from "@/components/app/empty-state";
import { SimulationBadge } from "@/components/app/simulation-badge";
import { CompetitorMatrix, OtherBusinessesList } from "@/components/queries/detail/competitor-matrix";
import { DetailSection } from "@/components/queries/detail/detail-section";
import { competitorMatrix, explainQuestion, otherBusinesses } from "@/components/queries/detail/insights";
import { ProviderResultCard } from "@/components/queries/detail/provider-result-card";
import { QueryStatusButton } from "@/components/queries/detail/query-status-button";
import { type ScanOption, ScanSelect } from "@/components/queries/detail/scan-select";
import { QueryScoreHistory } from "@/components/queries/detail/score-history";
import { WhatThisMeans } from "@/components/queries/detail/what-this-means";
import { CATEGORY_LABELS, PRIORITY_LABEL, sortProviders } from "@/components/queries/labels";
import { RetryButton } from "@/components/queries/retry-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  findScanRef,
  getQueryRunsForScan,
  getQueryScanHistory,
  type QueryHistoryEntry,
  type QueryRunDetail,
  type ScanRef,
} from "@/db/repositories/analysis";
import { getProjectForUser, listCompetitors } from "@/db/repositories/projects";
import { getQuery } from "@/db/repositories/queries";
import { requireUser } from "@/lib/auth/session";
import { isAppError } from "@/lib/errors";
import { formatDate, formatDateTime } from "@/lib/format";
import { logger } from "@/lib/logger";

export const metadata: Metadata = { title: "Question details" };

const uuid = z.uuid();

function scanLabel(date: Date, mode: "live" | "mock", latest: boolean) {
  return `${formatDate(date)}${mode === "mock" ? " (simulated)" : ""}${latest ? " · latest" : ""}`;
}

export default async function QueryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; queryId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { projectId, queryId } = await params;
  const project = await getProjectForUser(user.id, projectId).catch((error) => {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  if (!uuid.safeParse(queryId).success) notFound();
  const query = await getQuery(project, queryId);
  if (!query) notFound();

  const sp = await searchParams;
  const scanParam = Array.isArray(sp.scan) ? sp.scan[0] : sp.scan;
  const basePath = `/projects/${project.id}/queries/${query.id}`;
  const listPath = `/projects/${project.id}/queries`;

  let loaded: {
    history: QueryHistoryEntry[];
    competitors: Awaited<ReturnType<typeof listCompetitors>>;
    scan: ScanRef | null;
    runs: QueryRunDetail[];
    notice: string | null;
  };
  try {
    const [history, competitors] = await Promise.all([getQueryScanHistory(project, query.id, { limit: 12 }), listCompetitors(project)]);
    let scan: ScanRef | null = null;
    let runs: QueryRunDetail[] = [];
    let notice: string | null = null;

    if (scanParam) {
      const requested = uuid.safeParse(scanParam).success ? await findScanRef(project, scanParam) : null;
      const requestedRuns = requested ? await getQueryRunsForScan(project, requested.id, query.id) : [];
      if (requested && requestedRuns.length > 0) {
        scan = requested;
        runs = requestedRuns;
      } else {
        notice = "The selected scan didn't check this question, so the most recent results are shown instead.";
      }
    }
    if (!scan) {
      const entry = history.find((e) => e.analyzed > 0) ?? history[0];
      if (entry) {
        [scan, runs] = await Promise.all([findScanRef(project, entry.scanId), getQueryRunsForScan(project, entry.scanId, query.id)]);
      }
    }
    loaded = { history, competitors, scan, runs, notice };
  } catch (error) {
    logger.error("query_detail.load_failed", { projectId: project.id, queryId: query.id, error: (error as Error).message });
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <BackLink href={listPath} />
        <Alert variant="danger" title="We couldn't load the AI answers for this question" action={<RetryButton />}>
          Something went wrong while loading this page. Please try again.
        </Alert>
      </div>
    );
  }

  const { history, competitors, scan, runs, notice } = loaded;
  const paused = query.status === "paused";

  const options: ScanOption[] = history.map((e, i) => ({ id: e.scanId, label: scanLabel(e.date, e.mode, i === 0) }));
  if (scan && !options.some((o) => o.id === scan.id)) {
    options.unshift({ id: scan.id, label: scanLabel(scan.completedAt ?? scan.createdAt, scan.mode, false) });
  }

  const header = (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Buyer question</p>
          <h2 className="mt-1 text-lg leading-snug font-semibold tracking-tight text-pretty">{query.text}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{CATEGORY_LABELS[query.category]}</Badge>
            <Badge variant={query.priority === "high" ? "warning" : "outline"}>{PRIORITY_LABEL[query.priority]} priority</Badge>
            {paused ? (
              <Badge variant="warning">
                <Pause aria-hidden="true" />
                Paused
              </Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
            <Badge variant="outline">{query.source === "manual" ? "Added manually" : "Generated"}</Badge>
            {query.service && <span className="text-xs text-subtle-foreground">· {query.service}</span>}
          </div>
        </div>
        <div className="shrink-0">
          <QueryStatusButton projectId={project.id} queryId={query.id} status={query.status} />
        </div>
      </div>
      {scan && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            <span>
              Answers collected {scan.status === "completed" ? "on" : "in the scan started"}{" "}
              <time dateTime={(scan.completedAt ?? scan.createdAt).toISOString()} title={formatDateTime(scan.completedAt ?? scan.createdAt)}>
                {formatDate(scan.completedAt ?? scan.createdAt)}
              </time>
            </span>
            {scan.status !== "completed" && <Badge variant="default">Scan {scan.status === "failed" ? "failed" : "in progress"}</Badge>}
            {scan.mode === "mock" && <SimulationBadge />}
            {project.isDemo && <Badge variant="demo">Demo data</Badge>}
          </div>
          <ScanSelect basePath={basePath} options={options} value={scan.id} />
        </div>
      )}
    </Card>
  );

  if (!scan) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <BackLink href={listPath} />
        {header}
        {notice && <Alert variant="info">{notice}</Alert>}
        <EmptyState
          icon={MessageSquareDashed}
          title="This question hasn't been checked yet"
          description={
            paused
              ? "It's paused, so scans skip it. Resume monitoring to include it in your next scan."
              : "It will be asked on every monitored AI platform in your next scan. Use the Run scan button above to check it now."
          }
        />
      </div>
    );
  }

  const providers = sortProviders([...scan.providers, ...runs.map((r) => r.provider)]);
  const runByProvider = new Map(runs.map((r) => [r.provider, r]));
  const matrix = competitorMatrix(project.name, runs);
  const others = otherBusinesses(runs);
  const meaning = explainQuestion({ businessName: project.name, hasWebsite: Boolean(project.domain), runs });
  const competitorDomains = competitors.filter((c) => c.domain).map((c) => ({ domain: c.domain as string, name: c.name }));
  const inMatrix = new Set(matrix.rows.map((r) => r.key));
  const notInScan = competitors.filter((c) => !inMatrix.has(c.id));

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <BackLink href={listPath} />
      {header}
      {notice && <Alert variant="info">{notice}</Alert>}

      <section aria-label="Answers by AI platform" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((p) => (
          <ProviderResultCard
            key={p}
            provider={p}
            run={runByProvider.get(p) ?? null}
            ownDomain={project.domain}
            competitorDomains={competitorDomains}
          />
        ))}
      </section>
      <p className="-mt-1 text-xs text-subtle-foreground sm:-mt-3">
        AI answers can vary between runs. Scores are based on the queries and providers monitored by your account. The result
        score is a proprietary monitoring metric, not a search-engine ranking.
      </p>

      <DetailSection title="What this means">
        <WhatThisMeans meaning={meaning} recommendationsHref={`/projects/${project.id}/recommendations`} />
      </DetailSection>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <DetailSection
          title="Competitors in these answers"
          description="Where you and each tracked competitor appeared, by AI platform."
        >
          {matrix.providers.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No answers could be analyzed in this scan.</p>
          ) : (
            <div className="space-y-3">
              <CompetitorMatrix providers={matrix.providers} rows={matrix.rows} />
              {competitors.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  You aren&apos;t tracking any competitors.{" "}
                  <Link href={`/projects/${project.id}/competitors`} className="font-medium text-foreground underline underline-offset-2">
                    Add competitors
                  </Link>{" "}
                  to see how they compare.
                </p>
              ) : (
                notInScan.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {notInScan.map((c) => c.name).join(", ")} {notInScan.length === 1 ? "was" : "were"} added after this scan
                    and will appear after the next one.
                  </p>
                )
              )}
            </div>
          )}
        </DetailSection>

        <DetailSection
          title="Other businesses recommended"
          description="Businesses the AI platforms recommended that you don't track as competitors."
        >
          <OtherBusinessesList items={others} />
        </DetailSection>
      </div>

      <DetailSection
        title="Score history"
        description="This question's result score in recent scans, averaged across the AI platforms that answered."
      >
        <QueryScoreHistory entries={history} currentScanId={scan.id} hrefForScan={(id) => `${basePath}?scan=${id}`} />
      </DetailSection>
    </div>
  );
}

function BackLink({ href }: { href: string }) {
  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href={href}>
          <ArrowLeft aria-hidden="true" />
          All questions
        </Link>
      </Button>
    </div>
  );
}
