import { MetricCard } from "@/components/dashboard/metric-card";
import { formatPercent, formatPosition } from "@/lib/format";

import { diff, formatSignedPoints, NOT_ENOUGH_DATA } from "./helpers";
import type { ProjectOverviewData } from "./types";

const notEnough = <span className="text-xs text-subtle-foreground">{NOT_ENOUGH_DATA}</span>;

/** The seven headline metrics, with change vs the previous completed scan. */
export function MetricGrid({ data }: { data: ProjectOverviewData }) {
  const o = data.metrics.overall;
  const p = data.previous?.overall ?? null;
  const hasRuns = o.runs > 0;
  const gap = data.metrics.competitorGap;
  const prevGap = data.previous?.competitorGap ?? null;
  // A delta only makes sense when there is a baseline; null renders "No previous data".
  const delta = (current: number | null, previous: number | null | undefined) => (p ? diff(current, previous ?? null) : null);
  // Compare gaps only against the same competitor; otherwise explain why there is no delta.
  const gapDelta = !gap || !p ? null : prevGap && prevGap.competitorName === gap.competitorName ? diff(gap.points, prevGap.points) : undefined;

  return (
    <section aria-labelledby="key-metrics-heading">
      <h2 id="key-metrics-heading" className="sr-only">
        Key metrics
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <MetricCard
          label="AI Visibility"
          value={hasRuns ? Math.round(o.score) : "—"}
          suffix={hasRuns ? "/100" : undefined}
          delta={hasRuns ? delta(o.score, p?.score) : undefined}
          deltaSuffix=" pts"
          footnote={notEnough}
          help="Average score of every monitored AI answer (0–100), combining mentions, recommendations, position, citations and sentiment. A proprietary monitoring metric, not a search-engine ranking."
        />
        <MetricCard
          label="Recommendation rate"
          value={hasRuns ? formatPercent(o.recommendationRate) : "—"}
          delta={hasRuns ? delta(o.recommendationRate, p?.recommendationRate) : undefined}
          deltaSuffix=" pts"
          footnote={notEnough}
          help="Share of monitored AI answers that suggested your business as an option."
        />
        <MetricCard
          label="Mention rate"
          value={hasRuns ? formatPercent(o.mentionRate) : "—"}
          delta={hasRuns ? delta(o.mentionRate, p?.mentionRate) : undefined}
          deltaSuffix=" pts"
          footnote={notEnough}
          help="Share of monitored AI answers that named your business at all, recommended or not."
        />
        <MetricCard
          label="Average position"
          value={o.averagePosition === null ? "—" : `#${formatPosition(o.averagePosition)}`}
          delta={o.averagePosition === null ? undefined : delta(o.averagePosition, p?.averagePosition)}
          invertDelta
          footnote={notEnough}
          help="Your average place in AI recommendation lists when you are recommended. Lower is better (#1 is the top spot)."
        />
        <MetricCard
          label="Share of voice"
          value={hasRuns ? formatPercent(o.shareOfVoice) : "—"}
          delta={hasRuns ? delta(o.shareOfVoice, p?.shareOfVoice) : undefined}
          deltaSuffix=" pts"
          footnote={notEnough}
          help="Your share of all business recommendations in monitored AI answers (you, competitors and other businesses)."
        />
        <MetricCard
          label="Citation rate"
          value={hasRuns ? formatPercent(o.citationRate) : "—"}
          delta={hasRuns ? delta(o.citationRate, p?.citationRate) : undefined}
          deltaSuffix=" pts"
          footnote={notEnough}
          help="Share of monitored AI answers that cited your own website as a source."
        />
        <MetricCard
          className="col-span-2"
          label="Competitor gap"
          value={gap ? formatSignedPoints(gap.points) : "—"}
          suffix={gap ? `points vs ${gap.competitorName}` : undefined}
          delta={gap ? gapDelta : undefined}
          deltaSuffix=" pts"
          footnote={
            gap ? (
              <span className="text-xs text-subtle-foreground">
                {prevGap
                  ? `Previous scan compared against ${prevGap.competitorName}.`
                  : "No competitor comparison in the previous scan."}
              </span>
            ) : (
              <span className="text-xs text-subtle-foreground">
                {data.competitorOrder.length > 0 ? "Run a new scan to measure the gap." : "Add competitors to measure the gap."}
              </span>
            )
          }
          help="Your AI Visibility score minus your strongest competitor's, from the same monitored answers. Negative means you are behind."
        />
      </div>
    </section>
  );
}
