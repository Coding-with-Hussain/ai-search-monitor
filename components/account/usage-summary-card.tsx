import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Entitlements, UsageSummary } from "@/lib/billing/entitlements";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { daysUntil } from "./labels";

type Level = "ok" | "high" | "full";

function level(used: number, limit: number): Level {
  if (limit <= 0) return "full";
  const pct = used / limit;
  return pct >= 1 ? "full" : pct >= 0.8 ? "high" : "ok";
}

function Meter({ label, used, limit, foot }: { label: string; used: number; limit: number; foot?: string }) {
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
        label={`${label}: ${used} of ${limit} used`}
        className={cn("mt-2", state === "full" ? "bg-danger-soft" : state === "high" ? "bg-warning-soft" : undefined)}
        indicatorClassName={state === "full" ? "bg-danger" : state === "high" ? "bg-warning" : undefined}
      />
      {foot && <p className="mt-1.5 text-xs text-subtle-foreground">{foot}</p>}
    </div>
  );
}

/** Plan, trial and usage against plan limits, with an upgrade path near limits. */
export function UsageSummaryCard({ usage, ent }: { usage: UsageSummary; ent: Entitlements }) {
  const queriesState = level(usage.queriesUsed, usage.queriesLimit);
  const projectsState = level(usage.projectsUsed, usage.projectsLimit);
  const trialDaysLeft = ent.isTrial && ent.trialEndsAt ? daysUntil(ent.trialEndsAt) : null;
  const nearLimit = queriesState !== "ok" || projectsState === "full";
  const showUpgrade = nearLimit || ent.isTrial || !ent.active;

  let message: string | null = null;
  if (!ent.active) message = ent.inactiveReason;
  else if (queriesState === "full") message = "You've used all monthly queries. Scheduled scans pause until your allowance resets or you upgrade.";
  else if (queriesState === "high") message = "You're close to your monthly query limit. Scans check your highest-priority questions first.";
  else if (projectsState === "full") message = "You've reached your plan's project limit.";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] leading-snug font-semibold tracking-tight">Plan &amp; usage</h2>
          <Badge variant={!ent.active ? "danger" : ent.isTrial ? "warning" : "secondary"}>
            {!ent.active ? "Inactive" : ent.isTrial ? "Trial" : ent.plan.name}
          </Badge>
        </div>
        <CardDescription>
          {ent.plan.name} plan
          {trialDaysLeft !== null && ent.active
            ? ` · ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your trial`
            : ent.cancelAtPeriodEnd
              ? ` · ends ${formatDate(ent.periodEnd)}`
              : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Meter
          label="Queries this month"
          used={usage.queriesUsed}
          limit={usage.queriesLimit}
          foot={`Resets ${formatDate(usage.periodEnd)}`}
        />
        <Meter label="Projects" used={usage.projectsUsed} limit={usage.projectsLimit} />
        {message && (
          <p
            className={cn(
              "rounded-lg px-3 py-2.5 text-[13px] leading-snug",
              !ent.active || queriesState === "full" ? "bg-danger-soft text-danger-text" : "bg-warning-soft text-warning-text",
            )}
          >
            {message}
          </p>
        )}
      </CardContent>
      <CardFooter className="justify-between">
        <Link href="/billing" className="text-[13px] font-medium text-muted-foreground hover:text-foreground hover:underline">
          Manage billing
        </Link>
        {showUpgrade && (
          <Button size="sm" asChild>
            <Link href="/billing#plans">{!ent.active ? "Choose a plan" : "Upgrade Plan"}</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
