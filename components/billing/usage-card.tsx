import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { UsageSummary } from "@/lib/billing/entitlements";
import { formatDate, formatNumber, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

type Level = "ok" | "high" | "full";

function level(used: number, limit: number): Level {
  if (limit <= 0) return "full";
  const ratio = used / limit;
  return ratio >= 1 ? "full" : ratio >= 0.8 ? "high" : "ok";
}

function UsageMeterRow({
  label,
  used,
  limit,
  unit,
  children,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
  children?: ReactNode;
}) {
  const state = level(used, limit);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular text-muted-foreground">
          <span className="font-medium text-foreground">{formatNumber(used)}</span> / {formatNumber(limit)}
        </span>
      </div>
      <Progress
        value={Math.min(used, limit)}
        max={limit}
        label={`${label}: ${formatNumber(used)} of ${formatNumber(limit)} ${unit} used`}
        className={cn("mt-2", state === "full" ? "bg-danger-soft" : state === "high" ? "bg-warning-soft" : undefined)}
        indicatorClassName={state === "full" ? "bg-danger" : state === "high" ? "bg-warning" : undefined}
      />
      {children}
    </div>
  );
}

/** Usage against the plan for the current billing period. */
export function UsageCard({ usage, planName }: { usage: UsageSummary; planName: string }) {
  const queries = level(usage.queriesUsed, usage.queriesLimit);
  const projects = level(usage.projectsUsed, usage.projectsLimit);
  const remaining = Math.max(0, usage.queriesLimit - usage.queriesUsed);
  const periodEndInclusive = new Date(usage.periodEnd.getTime() - 1);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <h2 className="text-[15px] leading-snug font-semibold tracking-tight">Usage this period</h2>
        <CardDescription>
          {formatDate(usage.periodStart)} – {formatDate(periodEndInclusive)} · resets {formatDate(usage.periodEnd)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <UsageMeterRow label="Queries this month" used={usage.queriesUsed} limit={usage.queriesLimit} unit="queries">
          {queries === "full" ? (
            <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-[13px] leading-snug text-danger-text">
              You&apos;ve used {formatNumber(usage.queriesUsed)}/{formatNumber(usage.queriesLimit)} queries this month. Scans
              pause until your allowance resets on {formatDate(usage.periodEnd)} or you{" "}
              <Link href="#plans" className="font-medium underline underline-offset-2">
                upgrade your plan
              </Link>
              .
            </p>
          ) : (
            <p className={cn("mt-1.5 text-xs", queries === "high" ? "text-warning-text" : "text-subtle-foreground")}>
              {pluralize(remaining, "query", "queries")} left. One query is one question checked on one scan.
            </p>
          )}
        </UsageMeterRow>

        <UsageMeterRow label="Projects" used={usage.projectsUsed} limit={usage.projectsLimit} unit="projects">
          <p className={cn("mt-1.5 text-xs", projects === "full" ? "text-warning-text" : "text-subtle-foreground")}>
            {projects === "full"
              ? `You've reached the ${planName} plan's project limit.`
              : `${pluralize(usage.projectsLimit - usage.projectsUsed, "more business", "more businesses")} can be monitored on ${planName}.`}
          </p>
        </UsageMeterRow>

        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4 text-[13px]">
          <span className="font-medium text-foreground">Reports generated</span>
          <span className="tabular font-medium text-foreground">{formatNumber(usage.reportsGenerated)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
