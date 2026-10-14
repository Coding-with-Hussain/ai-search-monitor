import { ChevronDown, Eye } from "lucide-react";

import { DetailSection } from "@/components/queries/detail/detail-section";
import type { CompetitorInsight } from "@/services/metrics/competitor-insights";

/** "XYZ Dental is 12 points ahead of you." / "You are ahead of Smile Clinic by 5 points." */
export function gapSentence(name: string, scoreGap: number) {
  const points = Math.round(Math.abs(scoreGap));
  const unit = points === 1 ? "point" : "points";
  if (points === 0) return `You and ${name} have the same score.`;
  return scoreGap > 0 ? `${name} is ${points} ${unit} ahead of you.` : `You are ahead of ${name} by ${points} ${unit}.`;
}

/**
 * Per competitor: the score gap in words and an expandable panel of observed
 * signals from the monitored answers (explicitly not proven causes).
 */
export function CompetitorInsights({ insights, yourScore }: { insights: CompetitorInsight[]; yourScore: number }) {
  const sorted = [...insights].sort((a, b) => b.scoreGap - a.scoreGap);
  return (
    <DetailSection
      title="Competitor by competitor"
      description="Observed signals from the monitored AI answers in your latest scan. They show patterns in the answers, not proven causes."
    >
      <ul className="space-y-3">
        {sorted.map((insight) => {
          const { competitor, scoreGap, signals } = insight;
          const ahead = scoreGap > 0;
          return (
            <li key={competitor.competitorId} className="rounded-lg border border-border">
              <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{competitor.name}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{gapSentence(competitor.name, scoreGap)}</p>
                </div>
                <p className="shrink-0 text-[13px] text-muted-foreground tabular">
                  <span className="font-semibold text-foreground">{Math.round(competitor.metrics.score)}</span> vs{" "}
                  <span className="font-semibold text-foreground">{Math.round(yourScore)}</span> (you)
                </p>
              </div>
              <details className="group border-t border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-[13px] font-medium select-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-start gap-2">
                    <Eye className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
                    <span className="min-w-0">
                      {ahead ? "Why are they winning?" : "Where are they stronger?"}
                      <span className="block font-normal text-subtle-foreground sm:ml-2 sm:inline">
                        {signals.length === 0 ? "No clear signals" : `${signals.length} observed ${signals.length === 1 ? "signal" : "signals"}`}
                      </span>
                    </span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-subtle-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="space-y-3 px-4 pt-1 pb-4">
                  {signals.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">
                      {ahead
                        ? `We didn't observe a single clear difference: ${competitor.name} is slightly ahead across several small signals. Check individual questions to see where it appears instead of you.`
                        : `In the monitored answers, ${competitor.name} doesn't outperform you on mentions, recommendations, position, citations or share of voice.`}
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {signals.map((s) => (
                        <li key={s.key} className="text-[13px] leading-relaxed">
                          <p className="font-medium text-foreground">{s.title}</p>
                          <p className="text-muted-foreground">{s.detail}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-subtle-foreground">
                    Observed in monitored AI answers. These signals are correlations, not confirmed reasons AI assistants
                    prefer one business.
                  </p>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </DetailSection>
  );
}
