import { Gauge } from "lucide-react";
import Link from "next/link";

import { formatNumber, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MonitoringFrequency } from "@/types/domain";

import { SCANS_PER_MONTH } from "./labels";

const FREQUENCY_WORD: Record<MonitoringFrequency, string> = { daily: "daily", weekly: "weekly", monthly: "monthly", manual: "manual" };

/**
 * Plain-language usage estimate: "38 active questions × weekly ≈ 152
 * queries/month — your plan includes 250."
 */
export function UsageLine({
  activeQuestions,
  frequency,
  monitoringEnabled,
  queriesPerMonth,
  planName,
  settingsHref,
}: {
  activeQuestions: number;
  frequency: MonitoringFrequency;
  monitoringEnabled: boolean;
  queriesPerMonth: number;
  planName: string;
  settingsHref: string;
}) {
  const automatic = monitoringEnabled && frequency !== "manual";
  const monthly = automatic ? activeQuestions * SCANS_PER_MONTH[frequency] : activeQuestions;
  const over = automatic && monthly > queriesPerMonth;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px] leading-relaxed",
        over ? "border-warning/40 bg-warning-soft text-warning-text" : "border-border bg-surface-muted/60 text-muted-foreground",
      )}
    >
      <Gauge className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0">
        {automatic ? (
          <>
            <span className="font-medium text-foreground tabular">{pluralize(activeQuestions, "active question")}</span> ×{" "}
            {FREQUENCY_WORD[frequency]} ≈ <span className="font-medium text-foreground tabular">{formatNumber(monthly)}</span>{" "}
            queries/month
          </>
        ) : (
          <>
            <span className="font-medium text-foreground tabular">{pluralize(activeQuestions, "active question")}</span>, checked when
            you run a scan ({formatNumber(activeQuestions)} {activeQuestions === 1 ? "query" : "queries"} per scan)
          </>
        )}
        {" — "}your {planName} plan includes <span className="tabular">{formatNumber(queriesPerMonth)}</span>.{" "}
        {over ? (
          <>
            When you run low, scans check your highest-priority questions first. Pause some questions or{" "}
            <Link href={settingsHref} className="font-medium underline underline-offset-2">
              change the frequency
            </Link>
            .
          </>
        ) : (
          <span className="text-subtle-foreground">Each question counts as one query per scan, whatever the number of AI platforms.</span>
        )}
      </p>
    </div>
  );
}
