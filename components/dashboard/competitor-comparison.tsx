import { formatPercent, formatPosition } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EntityMetrics } from "@/types/domain";

export interface ComparisonEntity {
  key: string;
  name: string;
  isYou: boolean;
  metrics: EntityMetrics;
}

/**
 * Horizontal bars comparing AI Visibility scores. Emphasis encoding: your
 * business in the accent color, competitors in a recessive neutral. Values are
 * labeled at the bar tip; the table below carries every metric.
 */
export function CompetitorBars({ entities }: { entities: ComparisonEntity[] }) {
  const sorted = [...entities].sort((a, b) => b.metrics.score - a.metrics.score);
  return (
    <ul className="space-y-3" aria-label="AI Visibility score by business">
      {sorted.map((e) => (
        <li key={e.key} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
          <span className={cn("truncate text-[13px]", e.isYou ? "font-semibold text-foreground" : "text-muted-foreground")} title={e.name}>
            {e.isYou ? `${e.name} (you)` : e.name}
          </span>
          <div className="flex items-center gap-2">
            <div className="relative h-5 flex-1">
              <div
                className="absolute inset-y-0 left-0 rounded-r-[4px]"
                style={{
                  width: `${Math.max(1.5, e.metrics.score)}%`,
                  background: e.isYou ? "var(--series-1)" : "var(--chart-muted)",
                }}
                aria-hidden="true"
              />
            </div>
            <span className={cn("w-8 text-right text-[13px] tabular", e.isYou ? "font-semibold" : "text-muted-foreground")}>
              {Math.round(e.metrics.score)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CompetitorTable({ entities }: { entities: ComparisonEntity[] }) {
  const sorted = [...entities].sort((a, b) => b.metrics.score - a.metrics.score);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="py-2 pr-3 text-left font-medium">Business</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Score</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Share of voice</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Recommended</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Mentioned</th>
            <th scope="col" className="py-2 pl-3 text-right font-medium">Avg. position</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {sorted.map((e) => (
            <tr key={e.key} className={cn("border-b border-border last:border-0", e.isYou && "bg-primary-soft/50")}>
              <th scope="row" className={cn("py-2.5 pr-3 text-left font-normal", e.isYou && "font-semibold")}>
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: e.isYou ? "var(--series-1)" : "var(--chart-muted)" }}
                    aria-hidden="true"
                  />
                  {e.name}
                  {e.isYou && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                </span>
              </th>
              <td className="px-3 py-2.5 text-right font-medium">{Math.round(e.metrics.score)}</td>
              <td className="px-3 py-2.5 text-right">{formatPercent(e.metrics.shareOfVoice)}</td>
              <td className="px-3 py-2.5 text-right">{formatPercent(e.metrics.recommendationRate)}</td>
              <td className="px-3 py-2.5 text-right">{formatPercent(e.metrics.mentionRate)}</td>
              <td className="py-2.5 pl-3 text-right">{formatPosition(e.metrics.averagePosition)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
