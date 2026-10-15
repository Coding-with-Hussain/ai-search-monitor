import type * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { Delta } from "./delta";
import { InfoTip } from "./info-tip";

/** Stat tile: label · value · optional delta · optional help. */
export function MetricCard({
  label,
  value,
  suffix,
  delta,
  deltaSuffix,
  invertDelta,
  deltaEmptyLabel,
  help,
  footnote,
  className,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  delta?: number | null;
  deltaSuffix?: string;
  invertDelta?: boolean;
  /** Shown instead of a change when there is none to show (default "No previous data"). */
  deltaEmptyLabel?: string;
  help?: React.ReactNode;
  footnote?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-2 p-4", className)}>
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <span>{label}</span>
        {help && <InfoTip label={`About ${label}`}>{help}</InfoTip>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      <div className="min-h-4">
        {delta !== undefined ? <Delta value={delta} suffix={deltaSuffix} invert={invertDelta} context="vs previous" emptyLabel={deltaEmptyLabel} /> : footnote}
      </div>
    </Card>
  );
}

export function MetricCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="h-3.5 w-24 animate-pulse rounded bg-surface-muted" />
      <div className="h-7 w-16 animate-pulse rounded bg-surface-muted" />
      <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
    </Card>
  );
}
