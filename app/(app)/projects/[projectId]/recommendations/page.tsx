import { CircleCheck, CircleSlash, ListPlus, Radar, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/app/empty-state";
import { SimulationBadge } from "@/components/app/simulation-badge";
import { RetryButton } from "@/components/history/retry-button";
import { SectionHeader } from "@/components/history/section-header";
import {
  CATEGORY_LABEL,
  hasRecommendationFilters,
  parseRecommendationFilters,
  recommendationsHref,
  type RecommendationFilterValues,
} from "@/components/recommendations/labels";
import { LockedRecommendationsCard } from "@/components/recommendations/locked-recommendations-card";
import { RecommendationCard, type RecommendationCardData } from "@/components/recommendations/recommendation-card";
import { RecommendationFilters } from "@/components/recommendations/recommendation-filters";
import { StatusTabs } from "@/components/recommendations/status-tabs";
import { RecommendationViewTracker } from "@/components/recommendations/view-tracker";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProjectForUser } from "@/db/repositories/projects";
import { countActiveQueries } from "@/db/repositories/queries";
import {
  BASIC_RECOMMENDATIONS_VISIBLE,
  countRecommendationsByStatus,
  listOpenRecommendationIds,
  listRecommendations,
  type RecommendationRow,
} from "@/db/repositories/recommendations";
import { getLatestCompletedScan } from "@/db/repositories/scans";
import { requireUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import { PLAN_IDS, PLANS } from "@/lib/billing/plans";
import { isAppError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { logger } from "@/lib/logger";
import type { Priority } from "@/types/domain";

export const metadata: Metadata = { title: "Recommendations" };

function toCardData(r: RecommendationRow): RecommendationCardData {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    reason: r.reason,
    evidence: r.evidence,
    action: r.action,
    category: r.category,
    priority: r.priority,
    impact: r.impact,
    difficulty: r.difficulty,
    status: r.status,
    updatedAt: r.updatedAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    dismissedAt: r.dismissedAt?.toISOString() ?? null,
  };
}

/** Split open recommendations into unlocked (shown) and locked (summarized) for basic plans. */
function applyPlanGate(rows: RecommendationRow[], openIds: string[], gated: boolean) {
  if (!gated) return { visible: rows, locked: [] as RecommendationRow[] };
  const unlocked = new Set(openIds.slice(0, BASIC_RECOMMENDATIONS_VISIBLE));
  return { visible: rows.filter((r) => unlocked.has(r.id)), locked: rows.filter((r) => !unlocked.has(r.id)) };
}

export default async function RecommendationsPage({
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
  const filters = parseRecommendationFilters(await searchParams);
  const basePath = `/projects/${project.id}/recommendations`;
  const filtered = hasRecommendationFilters(filters);

  const header = (meta?: React.ReactNode) => (
    <SectionHeader
      title="Recommendations"
      description="Practical next steps to improve how AI assistants see your business, ranked by priority and expected impact."
      meta={meta}
    />
  );

  let data;
  try {
    const [rows, counts, latest, ent, openIds, activeQueries] = await Promise.all([
      listRecommendations(project, filters),
      countRecommendationsByStatus(project, { priority: filters.priority, category: filters.category }),
      getLatestCompletedScan(project),
      getEntitlements(user.id),
      filters.status === "open" ? listOpenRecommendationIds(project) : Promise.resolve([] as string[]),
      countActiveQueries(project),
    ]);
    data = { rows, counts, latest, ent, openIds, activeQueries };
  } catch (error) {
    logger.error("recommendations.load_failed", { projectId: project.id, error: (error as Error).message });
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {header()}
        <Alert variant="danger" title="We couldn't load your recommendations" action={<RetryButton />}>
          Something went wrong while loading this page. Please try again.
        </Alert>
      </div>
    );
  }

  const { rows, counts, latest, ent, openIds, activeQueries } = data;
  const total = counts.open + counts.completed + counts.dismissed;
  const gated = filters.status === "open" && !ent.plan.features.advancedRecommendations;
  const { visible, locked } = applyPlanGate(rows, openIds, gated);
  const isSimulation = latest?.mode === "mock" || rows.some((r) => r.scanMode === "mock");

  const meta = latest ? (
    <>
      <span>Based on monitored AI answers from your scan on {formatDate(latest.completedAt ?? latest.createdAt)}</span>
      {isSimulation && <SimulationBadge />}
      {project.isDemo && <Badge variant="demo">Demo data</Badge>}
    </>
  ) : undefined;

  // Nothing at all yet (no filters): explain how recommendations appear.
  if (total === 0 && !filtered) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {header(meta)}
        {latest ? (
          <EmptyState
            icon={CircleCheck}
            title="No recommendations right now"
            description="Your latest scan didn't surface a gap we have a recommendation for. New opportunities appear here after each scan as we observe new signals."
          />
        ) : (
          <EmptyState
            icon={Radar}
            title="No recommendations yet"
            description={
              activeQueries === 0
                ? "Run an AI scan to discover opportunities. Start by adding or generating the buyer questions to monitor."
                : "Run an AI scan to discover opportunities. Use the Run scan button above; recommendations appear when it completes."
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
        )}
      </div>
    );
  }

  const upgradePlan = PLAN_IDS.map((id) => PLANS[id]).find((p) => p.features.advancedRecommendations) ?? null;
  const lockedByPriority: Record<Priority, number> = { high: 0, medium: 0, low: 0 };
  for (const r of locked) lockedByPriority[r.priority]++;
  const lockedCategories = Array.from(new Set(locked.map((r) => CATEGORY_LABEL[r.category])));

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <RecommendationViewTracker projectId={project.id} openCount={counts.open} />
      {header(meta)}

      <Alert variant="neutral">
        Recommendations are based on observed signals in your monitored AI answers. They point to practical improvements,
        but they do not guarantee that AI assistants will recommend your business.
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusTabs basePath={basePath} filters={filters} counts={counts} />
        <RecommendationFilters basePath={basePath} filters={filters} />
      </div>

      {visible.length > 0 && (
        <ul className="flex flex-col gap-4" aria-label={`${filters.status} recommendations`}>
          {visible.map((r) => (
            <li key={r.id}>
              <RecommendationCard projectId={project.id} recommendation={toCardData(r)} />
            </li>
          ))}
        </ul>
      )}

      {locked.length > 0 && (
        <LockedRecommendationsCard
          count={locked.length}
          byPriority={lockedByPriority}
          categories={lockedCategories}
          planName={ent.plan.name}
          upgradePlanName={upgradePlan?.name ?? null}
          visibleLimit={BASIC_RECOMMENDATIONS_VISIBLE}
        />
      )}

      {rows.length === 0 && <TabEmptyState basePath={basePath} filters={filters} filtered={filtered} counts={counts} />}

      <p className="text-xs text-subtle-foreground">
        AI answers can vary between runs. Recommendations are refreshed after every scan, based on the questions and AI
        platforms monitored by your account.
      </p>
    </div>
  );
}

function TabEmptyState({
  basePath,
  filters,
  filtered,
  counts,
}: {
  basePath: string;
  filters: RecommendationFilterValues;
  filtered: boolean;
  counts: Record<"open" | "completed" | "dismissed", number>;
}) {
  if (filtered) {
    return (
      <EmptyState
        icon={SearchX}
        className="py-10"
        title="No recommendations match these filters"
        description="Try another priority or category, or clear the filters."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={recommendationsHref(basePath, { status: filters.status })}>Clear filters</Link>
          </Button>
        }
      />
    );
  }
  if (filters.status === "open") {
    return (
      <EmptyState
        icon={CircleCheck}
        className="py-10"
        title="You're all caught up"
        description="There are no open recommendations right now. New opportunities appear here when a scan observes new signals in your monitored answers."
        action={
          counts.completed > 0 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={recommendationsHref(basePath, { status: "completed" })}>View completed recommendations</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }
  if (filters.status === "completed") {
    return (
      <EmptyState
        icon={CircleCheck}
        className="py-10"
        title="No completed recommendations yet"
        description="Mark a recommendation complete once you've acted on it to keep track of your progress."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={basePath}>View open recommendations</Link>
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={CircleSlash}
      className="py-10"
      title="No dismissed recommendations"
      description="Recommendations you dismiss appear here, and you can reopen them at any time."
    />
  );
}
