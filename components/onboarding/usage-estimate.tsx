import { Gauge } from "lucide-react";

import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MonitoringFrequency } from "@/types/domain";

import { FREQUENCY_LABEL, SCANS_PER_MONTH } from "./constants";

/** Plain-language estimate of monthly query usage for the chosen settings. */
export function UsageEstimate({
  queryCount,
  frequency,
  generate,
  runFirstScan,
  queriesPerMonth,
  remaining,
  planName,
}: {
  queryCount: number;
  frequency: MonitoringFrequency;
  generate: boolean;
  runFirstScan: boolean;
  queriesPerMonth: number;
  remaining: number;
  planName: string;
}) {
  const count = Number.isFinite(queryCount) ? queryCount : 0;
  const monthly = count * SCANS_PER_MONTH[frequency];
  const overMonthly = generate && monthly > queriesPerMonth;
  const firstScanLimited = generate && runFirstScan && count > remaining;
  const warn = overMonthly || firstScanLimited;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-4 text-[13px] leading-relaxed",
        warn ? "border-warning/40 bg-warning-soft" : "border-border bg-surface-muted/60",
      )}
      aria-live="polite"
    >
      <Gauge className={cn("mt-0.5 size-4 shrink-0", warn ? "text-warning-text" : "text-muted-foreground")} aria-hidden="true" />
      <div className="min-w-0 space-y-1.5">
        <p className="font-medium text-foreground">
          {!generate ? (
            <>No questions will be generated, so nothing is checked until you add questions yourself.</>
          ) : frequency === "manual" ? (
            <>
              <span className="tabular">{formatNumber(count)}</span> questions, checked only when you run a scan (up to{" "}
              <span className="tabular">{formatNumber(count)}</span> queries per scan)
            </>
          ) : (
            <>
              <span className="tabular">{formatNumber(count)}</span> questions × {FREQUENCY_LABEL[frequency].toLowerCase()} ≈{" "}
              <span className="tabular">{formatNumber(monthly)}</span> queries/month
            </>
          )}
        </p>
        <p className="text-muted-foreground">
          Your {planName} plan includes <span className="tabular">{formatNumber(queriesPerMonth)}</span> queries/month, and you
          have <span className="tabular">{formatNumber(remaining)}</span> left this month. Each question counts as one query per
          scan, however many AI platforms you select.
        </p>
        {warn && (
          <p className="text-warning-text">
            {remaining === 0 && runFirstScan
              ? "You have no queries left this month, so the first scan can't run until your allowance resets or you upgrade."
              : "When you run low, scans check your highest-priority questions first."}
          </p>
        )}
      </div>
    </div>
  );
}
