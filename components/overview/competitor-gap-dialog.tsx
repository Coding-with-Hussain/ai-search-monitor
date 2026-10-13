"use client";

import { ArrowRight, Eye } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatPercent, formatPosition } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CompetitorSignal } from "@/services/metrics/competitor-insights";
import type { EntityMetrics } from "@/types/domain";

interface Side {
  name: string;
  metrics: EntityMetrics;
}

const ROWS: Array<{ label: string; value: (m: EntityMetrics) => string; better: (a: EntityMetrics, b: EntityMetrics) => number }> = [
  { label: "AI Visibility score", value: (m) => `${Math.round(m.score)}/100`, better: (a, b) => a.score - b.score },
  { label: "Mention rate", value: (m) => formatPercent(m.mentionRate), better: (a, b) => a.mentionRate - b.mentionRate },
  { label: "Recommendation rate", value: (m) => formatPercent(m.recommendationRate), better: (a, b) => a.recommendationRate - b.recommendationRate },
  { label: "Citation coverage", value: (m) => formatPercent(m.citationRate), better: (a, b) => a.citationRate - b.citationRate },
  {
    label: "Average position",
    value: (m) => (m.averagePosition === null ? "—" : `#${formatPosition(m.averagePosition)}`),
    // Lower is better; missing positions never "win".
    better: (a, b) =>
      a.averagePosition === null || b.averagePosition === null ? 0 : b.averagePosition - a.averagePosition,
  },
  { label: "Share of voice", value: (m) => formatPercent(m.shareOfVoice), better: (a, b) => a.shareOfVoice - b.shareOfVoice },
];

/** "See why": you vs the strongest competitor, plus observed signals. */
export function CompetitorGapDialog({
  you,
  competitor,
  signals,
  competitorsHref,
}: {
  you: Side;
  competitor: Side;
  signals: CompetitorSignal[];
  competitorsHref: string | null;
}) {
  const behind = competitor.metrics.score > you.metrics.score;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye aria-hidden="true" />
          See why
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {you.name} vs {competitor.name}
          </DialogTitle>
          <DialogDescription>Side-by-side results from the same monitored AI answers in your latest scan.</DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">
              Comparison of {you.name} and {competitor.name}
            </caption>
            <thead className="bg-surface-muted text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="w-[40%] px-3 py-2 text-left font-medium">
                  Metric
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  <span className="block truncate" title={you.name}>
                    {you.name} <span className="font-normal">(you)</span>
                  </span>
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  <span className="block truncate" title={competitor.name}>
                    {competitor.name}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="tabular">
              {ROWS.map((row) => {
                const cmp = row.better(you.metrics, competitor.metrics);
                return (
                  <tr key={row.label} className="border-t border-border">
                    <th scope="row" className="px-3 py-2.5 text-left font-normal text-muted-foreground">
                      {row.label}
                    </th>
                    <td className={cn("px-3 py-2.5 text-right", cmp > 0 && "font-semibold")}>{row.value(you.metrics)}</td>
                    <td className={cn("px-3 py-2.5 text-right", cmp < 0 && "font-semibold")}>{row.value(competitor.metrics)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="-mt-2 text-xs text-subtle-foreground">The stronger value in each row is shown in bold.</p>

        <div>
          <h3 className="text-sm font-semibold">
            {behind ? `Why ${competitor.name} appears more often` : `Where ${competitor.name} is still stronger`}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Observed signals in monitored answers, not proven causes.</p>
          {signals.length > 0 ? (
            <ul className="mt-3 space-y-2.5">
              {signals.map((s) => (
                <li key={s.key} className="rounded-lg border border-border bg-surface-muted/50 px-3 py-2.5">
                  <p className="text-[13px] font-medium">{s.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{s.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-3 text-[13px] text-muted-foreground">
              No clear difference stood out: {competitor.name} does not outperform you by a meaningful margin on any monitored
              signal.
            </p>
          )}
        </div>

        {competitorsHref && (
          <div className="flex justify-end">
            <Button asChild variant="secondary" size="sm">
              <Link href={competitorsHref}>
                Open competitor analysis
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
