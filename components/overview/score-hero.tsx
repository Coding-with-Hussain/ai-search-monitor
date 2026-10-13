import { Plus, Swords } from "lucide-react";
import Link from "next/link";

import { Delta } from "@/components/dashboard/delta";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { competitorInsight, strongestCompetitor } from "@/services/metrics/competitor-insights";
import { scoreBand, scoreChange } from "@/services/scoring";

import { CompetitorGapDialog } from "./competitor-gap-dialog";
import { coverage, formatSignedPoints, gapSentence, METRIC_DISCLAIMER, overviewLinks, TRUST_NOTE } from "./helpers";
import { ScoreExplainer } from "./score-explainer";
import { DataSourceBadges } from "./simulation-label";
import { TOUR_TARGETS, type ProjectOverviewData } from "./types";

const BAND_COPY = {
  strong: { label: "Strong visibility", tone: "success" as const },
  moderate: { label: "Moderate visibility", tone: "default" as const },
  weak: { label: "Low visibility", tone: "warning" as const },
  none: { label: "No data yet", tone: "secondary" as const },
};

/** Hero: AI Visibility score, change, methodology, and the competitor gap callout. */
export function ScoreHero({ data }: { data: ProjectOverviewData }) {
  const { metrics, previous } = data;
  const score = metrics.overall.score;
  const change = scoreChange(score, previous?.overall.score);
  const band = BAND_COPY[scoreBand(score)];
  const cov = coverage(metrics);

  return (
    <Card className="grid scroll-mt-24 overflow-hidden lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" data-tour={TOUR_TARGETS.score}>
      <section aria-labelledby="ai-visibility-heading" className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-7 sm:p-6">
        <div className="flex justify-center sm:block">
          <ScoreRing value={score} size={152} stroke={11} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="ai-visibility-heading" className="text-base font-semibold tracking-tight">
              AI Visibility Score
            </h2>
            <Badge variant={band.tone}>{band.label}</Badge>
            <DataSourceBadges data={data} />
          </div>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-3xl font-semibold tracking-tight tabular">
              {Math.round(score)}
              <span className="text-base font-normal text-muted-foreground">/100</span>
            </span>
            {change ? (
              change.percent !== null ? (
                <Delta value={change.percent} suffix="%" context="vs previous period" className="text-[13px]" />
              ) : (
                <Delta value={change.points} suffix=" pts" context="vs previous period" className="text-[13px]" />
              )
            ) : (
              <span className="text-[13px] text-subtle-foreground">First completed scan, no previous period yet</span>
            )}
          </p>
          {change && change.percent !== null && (
            <p className="mt-0.5 text-xs text-subtle-foreground tabular">
              {formatSignedPoints(change.points)} points since the previous scan
            </p>
          )}
          <p className="mt-3 text-[13px] text-muted-foreground">{cov.text}</p>
          <p className="text-[13px] text-muted-foreground">Latest scan: {formatDate(data.scannedAt)}</p>
          <div className="mt-3">
            <ScoreExplainer coverageText={cov.text} scoringVersion={metrics.scoringVersion} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-subtle-foreground">
            {TRUST_NOTE} {METRIC_DISCLAIMER}
          </p>
        </div>
      </section>
      <CompetitorGapPanel data={data} />
    </Card>
  );
}

function CompetitorGapPanel({ data }: { data: ProjectOverviewData }) {
  const links = overviewLinks(data);
  const strongest = strongestCompetitor(data.metrics);
  const insight = strongest ? competitorInsight(data.metrics, strongest.competitorId) : null;
  const points = strongest ? Math.round((data.metrics.overall.score - strongest.metrics.score) * 10) / 10 : null;
  const behind = points !== null && points < 0;

  return (
    <section
      aria-labelledby="competitor-gap-heading"
      className="flex flex-col justify-center gap-3 border-t border-border bg-surface-muted/40 p-5 sm:p-6 lg:border-t-0 lg:border-l"
    >
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Swords className="size-4" aria-hidden="true" />
        <h2 id="competitor-gap-heading" className="font-medium">
          Competitor gap
        </h2>
      </div>
      {strongest && points !== null ? (
        <>
          <p className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight tabular">{formatSignedPoints(points)}</span>
            <span className="text-sm text-muted-foreground">points</span>
          </p>
          <p className="text-[15px] leading-snug font-medium text-pretty">{gapSentence(points, strongest.name)}</p>
          <p className="text-[13px] text-muted-foreground">
            {behind
              ? "See which observed signals set them apart in the monitored answers."
              : "Keep monitoring: AI answers change, and competitors can catch up."}
          </p>
          {insight && (
            <div className="pt-1">
              <CompetitorGapDialog
                you={{ name: data.businessName, metrics: data.metrics.overall }}
                competitor={{ name: strongest.name, metrics: strongest.metrics }}
                signals={insight.signals}
                competitorsHref={links.competitors}
              />
            </div>
          )}
        </>
      ) : data.competitorOrder.length > 0 ? (
        <>
          <p className="text-[15px] font-medium">Competitors were added after this scan.</p>
          <p className="text-[13px] text-muted-foreground">
            Run a new scan with the button above to measure how you compare with them.
          </p>
        </>
      ) : (
        <>
          <p className="text-[15px] font-medium">No competitors tracked yet.</p>
          <p className="text-[13px] text-muted-foreground">
            Add the businesses you compete with to see who AI assistants recommend instead of you.
          </p>
          {links.competitors && (
            <div className="pt-1">
              <Button asChild variant="outline" size="sm">
                <Link href={links.competitors}>
                  <Plus aria-hidden="true" />
                  Add competitors
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
