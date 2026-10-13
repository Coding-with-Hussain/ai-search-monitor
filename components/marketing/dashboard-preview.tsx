import { CompetitorBars } from "@/components/dashboard/competitor-comparison";
import { Delta } from "@/components/dashboard/delta";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PROVIDER_IDS } from "@/types/domain";

import {
  EXAMPLE_BUSINESS,
  EXAMPLE_COMPETITORS,
  EXAMPLE_METRICS,
  EXAMPLE_PLATFORM_SCORES,
  EXAMPLE_SCORE,
  EXAMPLE_SCORE_DELTA,
} from "./example-data";
import { PlatformScores } from "./platform-scores";

/**
 * Product visual for the hero, assembled from the real dashboard primitives
 * with clearly labeled example data.
 */
export function DashboardPreview() {
  const initials = EXAMPLE_BUSINESS.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  return (
    <figure>
      <div className="rounded-2xl border border-border bg-surface-muted/70 p-1.5 shadow-pop sm:p-2">
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-xs font-semibold text-primary-soft-foreground"
                aria-hidden="true"
              >
                {initials}
              </span>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-foreground">{EXAMPLE_BUSINESS.name}</p>
                <p className="truncate text-xs text-muted-foreground">{EXAMPLE_BUSINESS.descriptor}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs text-subtle-foreground md:inline">Weekly monitoring</span>
              <Badge variant="demo">Example dashboard</Badge>
            </div>
          </div>

          <div className="grid gap-3 p-3 text-left sm:gap-4 sm:p-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <Card className="flex flex-col items-center justify-center gap-3 p-5 text-center">
              <ScoreRing value={EXAMPLE_SCORE} size={152} />
              <Delta value={EXAMPLE_SCORE_DELTA} context="vs last month" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Across {EXAMPLE_BUSINESS.questions} buyer questions on {PROVIDER_IDS.length} AI platforms
              </p>
            </Card>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              <Card className="p-5">
                <p className="text-[13px] font-medium text-muted-foreground">Score by AI platform</p>
                <PlatformScores scores={EXAMPLE_PLATFORM_SCORES} showVendor={false} className="mt-4" />
              </Card>
              <Card className="hidden p-5 sm:block">
                <p className="mb-4 text-[13px] font-medium text-muted-foreground">Who AI recommends</p>
                <CompetitorBars entities={EXAMPLE_COMPETITORS.slice(0, 3)} />
              </Card>
              <div className="hidden grid-cols-2 gap-3 sm:grid sm:gap-4 md:col-span-2 xl:grid-cols-4">
                {EXAMPLE_METRICS.map((m) => (
                  <MetricCard
                    key={m.label}
                    label={m.label}
                    value={m.value}
                    suffix={m.suffix}
                    delta={m.delta}
                    deltaSuffix={m.deltaSuffix}
                    invertDelta={m.invert}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mx-auto mt-4 max-w-xl text-center text-xs leading-relaxed text-subtle-foreground">
        Example dashboard with illustrative data for a fictional business. Your results depend on your questions,
        competitors and the AI platforms you monitor.
      </figcaption>
    </figure>
  );
}
