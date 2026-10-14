import type * as React from "react";

import { Delta } from "@/components/dashboard/delta";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { scoreBand } from "@/services/scoring";
import type { ScanMetrics } from "@/types/domain";

import { METRIC_NOTE, scoreDiff, TRUST_NOTE } from "./labels";

const BAND = {
  strong: { label: "Strong visibility", variant: "success" as const },
  moderate: { label: "Moderate visibility", variant: "default" as const },
  weak: { label: "Low visibility", variant: "warning" as const },
  none: { label: "No data", variant: "secondary" as const },
};

/** "Based on 120 monitored AI answers (40 questions × 3 platforms)." */
export function coverageText(metrics: ScanMetrics) {
  const platforms = metrics.providers.filter((p) => p.status !== "unavailable").length;
  const questions = metrics.queries.length;
  return `Based on ${formatNumber(metrics.runsSucceeded)} monitored AI ${metrics.runsSucceeded === 1 ? "answer" : "answers"} (${formatNumber(
    questions,
  )} ${questions === 1 ? "question" : "questions"} × ${platforms} ${platforms === 1 ? "platform" : "platforms"}).`;
}

/** Score ring + change vs the previous completed scan + coverage and trust notes. */
export function ScoreSummary({
  metrics,
  previousScore,
  heading = "AI Visibility Score",
  badges,
  children,
  className,
}: {
  metrics: ScanMetrics;
  previousScore: number | null;
  heading?: string;
  badges?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const score = metrics.overall.runs > 0 ? metrics.overall.score : null;
  const change = scoreDiff(score, previousScore);
  const band = BAND[scoreBand(score)];
  return (
    <div className={cn("flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7", className)}>
      <div className="flex justify-center sm:block">
        <ScoreRing value={score} size={144} stroke={11} showLabel={false} label={heading} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold tracking-tight">{heading}</h3>
          <Badge variant={band.variant}>{band.label}</Badge>
          {badges}
        </div>
        <p className="mt-2.5 text-sm">
          {previousScore === null ? (
            <span className="text-subtle-foreground">No previous completed scan to compare with.</span>
          ) : (
            <Delta value={change} suffix=" pts" context={`vs previous scan (${Math.round(previousScore)})`} className="text-sm [&_svg]:size-4" />
          )}
        </p>
        <p className="mt-3 text-[13px] text-muted-foreground">{coverageText(metrics)}</p>
        {children}
        <p className="mt-3 text-xs leading-relaxed text-subtle-foreground">
          {TRUST_NOTE} {METRIC_NOTE}
        </p>
      </div>
    </div>
  );
}
