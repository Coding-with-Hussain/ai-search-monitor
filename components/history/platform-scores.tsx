import { PlugZap } from "lucide-react";

import { Delta } from "@/components/dashboard/delta";
import { formatNumber, formatPercent } from "@/lib/format";
import { PROVIDER_META } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import { PROVIDER_IDS, type ProviderMetrics } from "@/types/domain";

import { scoreDiff } from "./labels";

/**
 * AI Visibility per platform for one scan (history detail and reports). The
 * color dot follows the platform; every value is written out as text.
 */
export function PlatformScores({
  providers,
  previous,
  className,
}: {
  providers: ProviderMetrics[];
  /** Platforms of the previous completed scan (null = no baseline, undefined = don't show change). */
  previous?: ProviderMetrics[] | null;
  className?: string;
}) {
  const ordered = PROVIDER_IDS.map((id) => providers.find((p) => p.provider === id)).filter((p): p is ProviderMetrics => Boolean(p));
  if (ordered.length === 0) {
    return <p className="text-sm text-muted-foreground">No AI platforms were part of this scan.</p>;
  }
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {ordered.map((p) => {
        const meta = PROVIDER_META[p.provider];
        const before = previous?.find((b) => b.provider === p.provider && b.status !== "unavailable") ?? null;
        const unavailable = p.status === "unavailable";
        return (
          <li key={p.provider} className="print-avoid-break min-w-0 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: meta.chartVar }} aria-hidden="true" />
              <span className="truncate text-sm font-semibold">{meta.name}</span>
            </div>
            {unavailable ? (
              <p className="mt-3 flex items-start gap-1.5 text-[13px] text-muted-foreground">
                <PlugZap className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                No results from {meta.name} in this scan. The overall score is based on the other platforms.
              </p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-2xl font-semibold tracking-tight">
                    {Math.round(p.score)}
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </span>
                  {previous !== undefined &&
                    (before ? (
                      <Delta value={scoreDiff(p.score, before.score)} suffix=" pts" context="vs previous" />
                    ) : (
                      <span className="text-xs text-subtle-foreground">No previous data</span>
                    ))}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
                  <div className="min-w-0">
                    <dt className="text-subtle-foreground">Questions</dt>
                    <dd className="mt-0.5 text-sm font-medium tabular">{formatNumber(p.queriesAnalyzed)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-subtle-foreground">Recommended</dt>
                    <dd className="mt-0.5 text-sm font-medium tabular">{formatPercent(p.recommendationRate)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-subtle-foreground">Mentioned</dt>
                    <dd className="mt-0.5 text-sm font-medium tabular">{formatPercent(p.mentionRate)}</dd>
                  </div>
                </dl>
                {p.failedRuns > 0 && (
                  <p className="mt-2 text-xs text-warning-text">
                    {p.failedRuns} {p.failedRuns === 1 ? "answer" : "answers"} could not be collected.
                  </p>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
