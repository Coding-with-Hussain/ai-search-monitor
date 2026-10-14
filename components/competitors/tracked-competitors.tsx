import { Globe, Users } from "lucide-react";
import Link from "next/link";

import { DetailSection } from "@/components/queries/detail/detail-section";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Competitor } from "@/db/schema";
import { formatDate, formatPercent } from "@/lib/format";
import type { EntityMetrics } from "@/types/domain";

import { AddCompetitorForm } from "./add-competitor-form";
import { RemoveCompetitorButton } from "./remove-competitor-button";
import { UpgradeLink } from "./upgrade-link";

export interface CompetitorUsage {
  used: number;
  max: number | null;
  planName: string;
}

function UsageMeter({ usage }: { usage: CompetitorUsage }) {
  if (usage.max === null) {
    return (
      <p className="text-[13px] text-muted-foreground">
        <span className="font-medium text-foreground tabular">{usage.used}</span> tracked · Unlimited on {usage.planName}
      </p>
    );
  }
  const full = usage.used >= usage.max;
  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-44">
      <p className="text-[13px] text-muted-foreground sm:text-right">
        <span className="font-medium text-foreground tabular">
          {usage.used} / {usage.max}
        </span>{" "}
        competitors
      </p>
      <Progress
        value={Math.min(usage.used, usage.max)}
        max={usage.max}
        label={`${usage.used} of ${usage.max} competitors used on your ${usage.planName} plan`}
        indicatorClassName={full ? "bg-warning" : undefined}
        className="h-1.5"
      />
    </div>
  );
}

/** Tracked competitors: plan usage, add form and list with per-competitor data status. */
export function TrackedCompetitors({
  projectId,
  competitors,
  metricsById,
  usage,
  inactiveReason,
}: {
  projectId: string;
  competitors: Competitor[];
  metricsById: Map<string, EntityMetrics>;
  usage: CompetitorUsage;
  inactiveReason: string | null;
}) {
  const atLimit = usage.max !== null && usage.used >= usage.max;
  const canAdd = !inactiveReason && !atLimit;

  return (
    <DetailSection
      title="Tracked competitors"
      description="Each scan checks whether AI answers mention or recommend these businesses alongside yours, or instead of yours."
      actions={<UsageMeter usage={usage} />}
    >
      <div className="space-y-5">
        {inactiveReason ? (
          <Alert
            variant="warning"
            title="Adding competitors is paused"
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/billing#plans">Choose a plan</Link>
              </Button>
            }
          >
            {inactiveReason}
          </Alert>
        ) : atLimit ? (
          <Alert variant="neutral" title={`You're tracking the maximum for your ${usage.planName} plan`} action={<UpgradeLink source="competitors_limit" />}>
            Your plan includes {usage.max} competitors per project. Remove one to add another, or upgrade to track more.
          </Alert>
        ) : null}

        <AddCompetitorForm projectId={projectId} disabled={!canAdd} />

        {competitors.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border-strong px-6 py-10 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Users className="size-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold">No competitors tracked yet</p>
            <p className="mt-1 max-w-md text-[13px] text-muted-foreground">
              Add the businesses customers compare you with. You&apos;ll see who AI assistants recommend instead of you, and the
              signals behind it.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Tracked competitors">
            {competitors.map((c) => {
              const m = metricsById.get(c.id);
              return (
                <li key={c.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {c.domain ? (
                        <a
                          href={c.website ?? `https://${c.domain}`}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                        >
                          <Globe className="size-3" aria-hidden="true" />
                          {c.domain}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <span className="text-subtle-foreground">No website added</span>
                      )}
                      <span className="text-subtle-foreground">Added {formatDate(c.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
                    {m ? (
                      <span className="text-xs text-muted-foreground tabular">
                        Score <span className="font-medium text-foreground">{Math.round(m.score)}</span> · Mentioned in{" "}
                        {formatPercent(m.mentionRate)}
                      </span>
                    ) : (
                      <span className="min-w-0 text-xs text-subtle-foreground">No data yet — appears after the next scan</span>
                    )}
                    <RemoveCompetitorButton projectId={projectId} competitorId={c.id} name={c.name} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DetailSection>
  );
}
