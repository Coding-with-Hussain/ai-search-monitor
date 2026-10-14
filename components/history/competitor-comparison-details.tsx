import { type ComparisonEntity, CompetitorBars, CompetitorTable } from "@/components/dashboard/competitor-comparison";
import { formatPercent, formatPosition } from "@/lib/format";
import { cn } from "@/lib/utils";

function MetricsList({ entities, className }: { entities: ComparisonEntity[]; className?: string }) {
  const sorted = [...entities].sort((a, b) => b.metrics.score - a.metrics.score);
  return (
    <ul className={cn("divide-y divide-border border-t border-border", className)} aria-label="Competitor metrics">
      {sorted.map((e) => (
        <li key={e.key} className={cn("py-3", e.isYou && "-mx-2 rounded-lg bg-primary-soft/50 px-2")}>
          <div className="flex items-baseline justify-between gap-3">
            <p className={cn("flex min-w-0 items-center gap-2 text-sm", e.isYou && "font-semibold")}>
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: e.isYou ? "var(--series-1)" : "var(--chart-muted)" }}
                aria-hidden="true"
              />
              <span className="min-w-0 break-words">{e.name}</span>
              {e.isYou && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
            </p>
            <p className="shrink-0 text-sm font-semibold tabular">
              {Math.round(e.metrics.score)}
              <span className="text-xs font-normal text-muted-foreground">/100</span>
            </p>
          </div>
          <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 pl-4 text-xs tabular">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Share of voice</dt>
              <dd className="font-medium">{formatPercent(e.metrics.shareOfVoice)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Recommended</dt>
              <dd className="font-medium">{formatPercent(e.metrics.recommendationRate)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Mentioned</dt>
              <dd className="font-medium">{formatPercent(e.metrics.mentionRate)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Avg. position</dt>
              <dd className="font-medium">{formatPosition(e.metrics.averagePosition)}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

/**
 * Score bars plus every comparison value as text: a table from the small
 * breakpoint up (and in print), a stacked list on phones so nothing scrolls
 * sideways.
 */
export function CompetitorComparisonDetails({ entities }: { entities: ComparisonEntity[] }) {
  return (
    <div className="flex flex-col gap-5 print:block print:space-y-5">
      <CompetitorBars entities={entities} />
      <div className="hidden sm:block print:block">
        <CompetitorTable entities={entities} />
      </div>
      <MetricsList entities={entities} className="sm:hidden print:hidden" />
    </div>
  );
}
