import type * as React from "react";

import { type ComparisonEntity, CompetitorBars, CompetitorTable } from "@/components/dashboard/competitor-comparison";
import { DetailSection } from "@/components/queries/detail/detail-section";
import { formatPercent, formatPosition } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Score bars + full metrics table (cards on small screens) for you and tracked competitors. */
export function CompetitorComparisonSection({ entities, meta }: { entities: ComparisonEntity[]; meta: React.ReactNode }) {
  return (
    <DetailSection
      title="How you compare"
      description="AI Visibility score and supporting metrics for you and each tracked competitor, from the same monitored answers."
      actions={meta}
    >
      <div className="space-y-5">
        <CompetitorBars entities={entities} />
        <div className="hidden border-t border-border pt-4 md:block">
          <CompetitorTable entities={entities} />
        </div>
        <CompactComparison entities={entities} />
        <p className="text-xs text-subtle-foreground">
          AI answers can vary between runs. Scores are based on the queries and providers monitored by your account. The AI
          Visibility score is a proprietary monitoring metric, not a search-engine ranking.
        </p>
      </div>
    </DetailSection>
  );
}

function CompactComparison({ entities }: { entities: ComparisonEntity[] }) {
  const sorted = [...entities].sort((a, b) => b.metrics.score - a.metrics.score);
  return (
    <ul className="space-y-2 border-t border-border pt-4 md:hidden" aria-label="Metrics by business">
      {sorted.map((e) => (
        <li key={e.key} className={cn("rounded-lg border border-border p-3", e.isYou && "bg-primary-soft/50")}>
          <div className="flex items-center justify-between gap-3">
            <p className={cn("truncate text-sm", e.isYou && "font-semibold")}>
              {e.name}
              {e.isYou && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
            </p>
            <p className="shrink-0 text-sm font-semibold tabular">
              {Math.round(e.metrics.score)}
              <span className="text-xs font-normal text-muted-foreground">/100</span>
            </p>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {(
              [
                ["Share of voice", formatPercent(e.metrics.shareOfVoice)],
                ["Recommended", formatPercent(e.metrics.recommendationRate)],
                ["Mentioned", formatPercent(e.metrics.mentionRate)],
                ["Avg. position", formatPosition(e.metrics.averagePosition)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <dt className="text-subtle-foreground">{label}</dt>
                <dd className="tabular">{value}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
