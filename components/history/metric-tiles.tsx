import { Delta } from "@/components/dashboard/delta";
import { MetricCard } from "@/components/dashboard/metric-card";
import { formatPercent, formatPosition } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EntityMetrics } from "@/types/domain";

import { scoreDiff } from "./labels";

/**
 * Change vs the previous completed scan. The change and its "vs previous"
 * context wrap as whole units, so narrow two-column tiles stay readable.
 */
function Change({ value, suffix, invert }: { value: number | null; suffix: string; invert?: boolean }) {
  if (value === null) return <span className="text-xs text-subtle-foreground">No previous data</span>;
  return (
    <span className="flex flex-wrap items-center gap-x-1">
      <Delta value={value} suffix={suffix} invert={invert} className="whitespace-nowrap" />
      <span className="text-xs text-subtle-foreground">vs previous</span>
    </span>
  );
}

const notEnoughData = <span className="text-xs text-subtle-foreground">Not enough data</span>;

/**
 * Headline metrics of one scan. With `previous` each tile shows the change vs
 * the previous completed scan (null = no previous scan); with
 * `previous === undefined` no change is shown (e.g. in reports).
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
  const footnote = (
    available: boolean,
    current: number | null,
    before: number | null | undefined,
    opts: { suffix?: string; invert?: boolean } = {},
  ) => {
    if (!available) return notEnoughData;
    if (previous === undefined) return undefined;
    return (
      <Change
        value={previous === null ? null : scoreDiff(current, before ?? null)}
        suffix={opts.suffix ?? " pts"}
        invert={opts.invert}
      />
    );
  };
  const hasPosition = overall.averagePosition !== null;

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5", className)}>
      <MetricCard
        label="Recommendation rate"
        value={has ? formatPercent(overall.recommendationRate) : "—"}
        footnote={footnote(has, overall.recommendationRate, previous?.recommendationRate)}
        help="Share of monitored AI answers that suggested your business as an option."
      />
      <MetricCard
        label="Mention rate"
        value={has ? formatPercent(overall.mentionRate) : "—"}
        footnote={footnote(has, overall.mentionRate, previous?.mentionRate)}
        help="Share of monitored AI answers that named your business at all, recommended or not."
      />
      <MetricCard
        label="Average position"
        value={hasPosition ? `#${formatPosition(overall.averagePosition)}` : "—"}
        footnote={footnote(hasPosition, overall.averagePosition, previous?.averagePosition, { suffix: "", invert: true })}
        help="Your average place in AI recommendation lists when you are recommended. Lower is better."
      />
      <MetricCard
        label="Share of voice"
        value={has ? formatPercent(overall.shareOfVoice) : "—"}
        footnote={footnote(has, overall.shareOfVoice, previous?.shareOfVoice)}
        help="Your share of all business recommendations in monitored AI answers."
      />
      <MetricCard
        className="col-span-2 lg:col-span-1"
        label="Citation rate"
        value={has ? formatPercent(overall.citationRate) : "—"}
        footnote={footnote(has, overall.citationRate, previous?.citationRate)}
        help="Share of monitored AI answers that cited your own website as a source."
      />
    </div>
  );
}
