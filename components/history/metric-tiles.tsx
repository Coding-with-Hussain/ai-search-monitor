import { MetricCard } from "@/components/dashboard/metric-card";
import { formatPercent, formatPosition } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EntityMetrics } from "@/types/domain";

import { scoreDiff } from "./labels";

/**
 * Headline metrics of one scan. With `previous` each tile shows the change vs
 * the previous completed scan; with `previous === undefined` no change is shown.
 */
export function MetricTiles({
  overall,
  previous,
  className,
}: {
  overall: EntityMetrics;
  previous?: EntityMetrics | null;
  className?: string;
}) {
  const has = overall.runs > 0;
  const delta = (current: number | null, before: number | null | undefined) =>
    previous === undefined ? undefined : previous === null ? null : scoreDiff(current, before ?? null);
  const none = <span className="text-xs text-subtle-foreground">Not enough data</span>;
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5", className)}>
      <MetricCard
        label="Recommendation rate"
        value={has ? formatPercent(overall.recommendationRate) : "—"}
        delta={has ? delta(overall.recommendationRate, previous?.recommendationRate) : undefined}
        deltaSuffix=" pts"
        footnote={has ? undefined : none}
        help="Share of monitored AI answers that suggested your business as an option."
      />
      <MetricCard
        label="Mention rate"
        value={has ? formatPercent(overall.mentionRate) : "—"}
        delta={has ? delta(overall.mentionRate, previous?.mentionRate) : undefined}
        deltaSuffix=" pts"
        footnote={has ? undefined : none}
        help="Share of monitored AI answers that named your business at all, recommended or not."
      />
      <MetricCard
        label="Average position"
        value={overall.averagePosition === null ? "—" : `#${formatPosition(overall.averagePosition)}`}
        delta={overall.averagePosition === null ? undefined : delta(overall.averagePosition, previous?.averagePosition)}
        invertDelta
        footnote={overall.averagePosition === null ? none : undefined}
        help="Your average place in AI recommendation lists when you are recommended. Lower is better."
      />
      <MetricCard
        label="Share of voice"
        value={has ? formatPercent(overall.shareOfVoice) : "—"}
        delta={has ? delta(overall.shareOfVoice, previous?.shareOfVoice) : undefined}
        deltaSuffix=" pts"
        footnote={has ? undefined : none}
        help="Your share of all business recommendations in monitored AI answers."
      />
      <MetricCard
        className="col-span-2 lg:col-span-1"
        label="Citation rate"
        value={has ? formatPercent(overall.citationRate) : "—"}
        delta={has ? delta(overall.citationRate, previous?.citationRate) : undefined}
        deltaSuffix=" pts"
        footnote={has ? undefined : none}
        help="Share of monitored AI answers that cited your own website as a source."
      />
    </div>
  );
}
