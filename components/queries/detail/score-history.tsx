import Link from "next/link";

import { SimulationBadge } from "@/components/app/simulation-badge";
import { Delta } from "@/components/dashboard/delta";
import type { QueryHistoryEntry } from "@/db/repositories/analysis";
import { formatDate, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * This question's score across recent scans: a compact bar list where every
 * value is also written as text. Bars use your business's series color.
 */
export function QueryScoreHistory({
  entries,
  currentScanId,
  hrefForScan,
}: {
  entries: QueryHistoryEntry[];
  currentScanId: string | null;
  hrefForScan: (scanId: string) => string;
}) {
  if (entries.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No completed scan has checked this question yet.</p>;
  }
  const includesSimulation = entries.some((e) => e.mode === "mock");
  const [latest, previous] = entries;
  const change = latest?.score != null && previous?.score != null ? latest.score - previous.score : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
        {entries.length > 1 ? (
          <span className="inline-flex items-center gap-1.5">
            Latest vs previous scan: <Delta value={change} suffix=" pts" />
          </span>
        ) : (
          <span>History builds up as more scans check this question.</span>
        )}
        {includesSimulation && <SimulationBadge label="Includes simulated scans" />}
      </div>
      <ol className="space-y-1" aria-label="Score by scan, newest first">
        {entries.map((e) => {
          const current = e.scanId === currentScanId;
          const score = e.score === null ? null : Math.round(e.score);
          return (
            <li key={e.scanId}>
              <Link
                href={hrefForScan(e.scanId)}
                aria-current={current ? "page" : undefined}
                scroll={false}
                className={cn(
                  "grid grid-cols-[4.5rem_minmax(0,1fr)_2.25rem] items-center gap-3 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:grid-cols-[5.5rem_minmax(0,1fr)_2.25rem_10rem]",
                  current && "bg-primary-soft/60 hover:bg-primary-soft/60",
                )}
              >
                <span className={cn("tabular", current ? "font-medium text-foreground" : "text-muted-foreground")}>
                  <span className="sr-only">{formatDate(e.date)}</span>
                  <span aria-hidden="true">{formatShortDate(e.date)}</span>
                </span>
                <span className="relative h-2.5 rounded-r-[4px] bg-surface-muted" aria-hidden="true">
                  <span
                    className="absolute inset-y-0 left-0 rounded-r-[4px]"
                    style={{ width: `${Math.max(score ?? 0, score ? 1.5 : 0)}%`, background: "var(--series-1)" }}
                  />
                </span>
                <span className="text-right font-medium tabular">
                  {score ?? "—"}
                  <span className="sr-only"> out of 100</span>
                </span>
                <span className="hidden text-xs text-muted-foreground tabular sm:block">
                  {e.analyzed === 0
                    ? "No analyzed answers"
                    : `Recommended by ${e.recommendedIn}/${e.analyzed}${e.bestPosition ? ` · best #${e.bestPosition}` : ""}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
