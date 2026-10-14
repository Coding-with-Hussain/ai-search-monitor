import { ListPlus, MessagesSquare, Plus, SearchX, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/app/empty-state";
import { SimulationBadge } from "@/components/app/simulation-badge";
import { AddQuestionDialog } from "@/components/queries/add-question-dialog";
import { GenerateQuestionsDialog } from "@/components/queries/generate-questions-dialog";
import { sortProviders, VISIBILITY_STATUSES } from "@/components/queries/labels";
import { QueryPagination } from "@/components/queries/pagination";
import { parseQueryFilters } from "@/components/queries/parse-filters";
import { QueryFilters } from "@/components/queries/query-filters";
import { QueryList } from "@/components/queries/query-list";
import { RetryButton } from "@/components/queries/retry-button";
import { SectionHeader } from "@/components/queries/section-header";
import type { QueryRowData } from "@/components/queries/types";
import { UsageLine } from "@/components/queries/usage-line";
import { hasActiveFilters } from "@/components/queries/url";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLatestCompletedScanRef, getScanResultsForQueries } from "@/db/repositories/analysis";
import { getProjectForUser } from "@/db/repositories/projects";
import { countActiveQueries, countQueries, listQueries, MAX_QUERIES_PER_PROJECT } from "@/db/repositories/queries";
import { requireUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import { isAppError } from "@/lib/errors";
import { formatDate, formatNumber, pluralize } from "@/lib/format";
import { logger } from "@/lib/logger";

export const metadata: Metadata = { title: "Questions" };

export default async function QuestionsPage({
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
  const filters = parseQueryFilters(await searchParams);
  const basePath = `/projects/${project.id}/queries`;

  let data;
  try {
    const [latest, totalCount, activeCount, ent] = await Promise.all([
      getLatestCompletedScanRef(project),
      countQueries(project),
      countActiveQueries(project),
      getEntitlements(user.id),
    ]);
    const visibilityFilter = Boolean(filters.status && VISIBILITY_STATUSES.includes(filters.status));
    // Visibility filters need a completed scan; without one, nothing can match.
    const list =
      visibilityFilter && !latest
        ? { rows: [], total: 0, page: 1, pageSize: 25 }
        : await listQueries(project, { ...filters, latestScanId: latest?.id ?? null });
    const results = await getScanResultsForQueries(
      project,
      latest?.id,
      list.rows.map((r) => r.id),
    );
    data = { latest, totalCount, activeCount, ent, list, results, visibilityFilter };
  } catch (error) {
    logger.error("questions.load_failed", { projectId: project.id, error: (error as Error).message });
    return (
      <Alert variant="danger" title="We couldn't load your questions" action={<RetryButton />}>
        Something went wrong while loading this page. Your questions are safe — please try again.
      </Alert>
    );
  }

  const { latest, totalCount, activeCount, ent, list, results, visibilityFilter } = data;
  const remainingCapacity = Math.max(0, MAX_QUERIES_PER_PROJECT - totalCount);
  const atCapacity = remainingCapacity === 0;
  const canCreate = ent.active && !atCapacity;
  const providers = filters.provider ? [filters.provider] : sortProviders([...project.providers, ...(latest?.providers ?? [])]);
  const rows: QueryRowData[] = list.rows.map((r) => ({
    id: r.id,
    text: r.text,
    category: r.category,
    priority: r.priority,
    status: r.status,
    source: r.source,
    service: r.service,
    results: results.get(r.id) ?? {},
  }));

  const toolbar = (
    <>
      <GenerateQuestionsDialog projectId={project.id} remainingCapacity={remainingCapacity} disabled={!canCreate} />
      <AddQuestionDialog projectId={project.id} services={project.services} disabled={!canCreate} />
    </>
  );

  const createNote = !ent.active ? (
    <Alert
      variant="warning"
      title="Adding questions is paused"
      action={
        <Button asChild size="sm" variant="outline">
          <Link href="/billing#plans">Choose a plan</Link>
        </Button>
      }
    >
      {ent.inactiveReason ?? "Your subscription is not active."}
    </Alert>
  ) : atCapacity ? (
    <Alert variant="neutral" title={`You've reached the ${formatNumber(MAX_QUERIES_PER_PROJECT)}-question limit for this project`}>
      Delete questions you no longer need to add or generate new ones. Pausing a question keeps it in the list.
    </Alert>
  ) : null;

  const header = (
    <SectionHeader
      title="Questions"
      description="The buyer questions we ask AI assistants on your behalf. Each scan checks every active question on every monitored AI platform."
      actions={totalCount > 0 ? toolbar : undefined}
    />
  );

  if (totalCount === 0) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {header}
        {createNote}
        <EmptyState
          icon={MessagesSquare}
          title="Generate buyer-intent queries"
          description={`We'll write realistic questions customers ask AI assistants about businesses like ${project.name}, based on your services, location and competitors. You can also add your own.`}
          action={
            <>
              <GenerateQuestionsDialog
                projectId={project.id}
                remainingCapacity={remainingCapacity}
                disabled={!canCreate}
                trigger={
                  <Button disabled={!canCreate}>
                    <Sparkles aria-hidden="true" />
                    Generate questions
                  </Button>
                }
              />
              <AddQuestionDialog
                projectId={project.id}
                services={project.services}
                disabled={!canCreate}
                trigger={
                  <Button variant="outline" disabled={!canCreate}>
                    <Plus aria-hidden="true" />
                    Add a question
                  </Button>
                }
              />
            </>
          }
        />
      </div>
    );
  }

  const pausedCount = totalCount - activeCount;
  const filtered = hasActiveFilters(filters);
  const pageOutOfRange = list.rows.length === 0 && list.total > 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {header}
      {createNote}
      <UsageLine
        activeQuestions={activeCount}
        frequency={project.monitoringFrequency}
        monitoringEnabled={project.monitoringEnabled}
        queriesPerMonth={ent.plan.limits.queriesPerMonth}
        planName={ent.plan.name}
        settingsHref={`/projects/${project.id}/settings`}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground tabular">{pluralize(totalCount, "question")}</span>
              <span className="tabular"> · {formatNumber(activeCount)} active</span>
              {pausedCount > 0 && <span className="tabular"> · {formatNumber(pausedCount)} paused</span>}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {latest ? (
                <span>Results from the scan on {formatDate(latest.completedAt ?? latest.createdAt)}</span>
              ) : (
                <span>No completed scan yet — results appear after your first scan</span>
              )}
              {latest?.mode === "mock" && <SimulationBadge />}
              {project.isDemo && <Badge variant="demo">Demo data</Badge>}
            </div>
          </div>
          <QueryFilters basePath={basePath} filters={filters} providers={sortProviders(project.providers)} hasLatestScan={Boolean(latest)} />
        </div>

        {rows.length > 0 ? (
          <QueryList
            rows={rows}
            projectId={project.id}
            basePath={basePath}
            providers={providers}
            hasScan={Boolean(latest)}
            scopedProvider={filters.provider}
          />
        ) : pageOutOfRange ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={ListPlus}
              className="py-10"
              title="No questions on this page"
              description="This page is past the end of the list."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href={basePath}>Go to the first page</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={SearchX}
              className="py-10"
              title="No questions match these filters"
              description={
                visibilityFilter && !latest
                  ? "Visibility filters use your latest completed scan. Run a scan with the button above, then filter by results."
                  : "Try a different search or remove some filters."
              }
              action={
                filtered ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={basePath}>Clear filters</Link>
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}

        {list.total > 0 && (
          <QueryPagination basePath={basePath} filters={filters} page={list.page} pageSize={list.pageSize} total={list.total} />
        )}
      </Card>

      <p className="text-xs text-subtle-foreground">
        AI answers can vary between runs. Results are based on the questions and AI platforms monitored by your account.
      </p>
    </div>
  );
}
