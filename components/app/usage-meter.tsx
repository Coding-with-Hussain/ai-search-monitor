import Link from "next/link";

import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Monthly query usage with an upgrade nudge near/at the limit. */
export function UsageMeter({
  used,
  limit,
  planName,
  isTrial,
  trialDaysLeft,
  className,
}: {
  used: number;
  limit: number;
  planName: string;
  isTrial: boolean;
  trialDaysLeft: number | null;
  className?: string;
}) {
  const pct = limit > 0 ? used / limit : 0;
  const state = pct >= 1 ? "full" : pct >= 0.8 ? "high" : "ok";
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-3", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">Queries this month</span>
        <span className="tabular text-muted-foreground">
          {formatNumber(used)} / {formatNumber(limit)}
        </span>
      </div>
      <Progress
        value={Math.min(used, limit)}
        max={limit}
        label="Monthly query usage"
        className={cn("mt-2", state === "full" ? "bg-danger-soft" : state === "high" ? "bg-warning-soft" : undefined)}
        indicatorClassName={state === "full" ? "bg-danger" : state === "high" ? "bg-warning" : undefined}
      />
      <div className="mt-2 flex items-center justify-between text-[11px] text-subtle-foreground">
        <span>
          {planName}
          {isTrial && trialDaysLeft !== null ? ` · trial, ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left` : ""}
        </span>
        <Link href="/billing" className="font-medium text-primary hover:underline">
          {state === "ok" ? "Plans" : "Upgrade"}
        </Link>
      </div>
      {state === "full" && <p className="mt-2 text-[11px] text-danger-text">You&apos;ve used {formatNumber(used)}/{formatNumber(limit)} queries this month.</p>}
    </div>
  );
}
