"use client";

import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trackClient } from "@/lib/analytics/client";
import { pluralize } from "@/lib/format";
import type { Priority } from "@/types/domain";

/**
 * Summary of recommendations hidden by the plan. Only counts and category
 * names reach the browser; the hidden recommendations' content never does.
 */
export function LockedRecommendationsCard({
  count,
  byPriority,
  categories,
  planName,
  upgradePlanName,
  visibleLimit,
}: {
  count: number;
  byPriority: Record<Priority, number>;
  categories: string[];
  planName: string;
  upgradePlanName: string | null;
  visibleLimit: number;
}) {
  const parts = (["high", "medium", "low"] as const)
    .filter((p) => byPriority[p] > 0)
    .map((p) => `${byPriority[p]} ${p}-priority`);
  const noun = count === 1 ? "recommendation" : "recommendations";

  return (
    <Card className="flex flex-col gap-4 border-dashed border-border-strong bg-surface-muted/50 p-5 shadow-none sm:flex-row sm:items-center sm:p-6">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Lock className="size-4.5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold tracking-tight text-pretty">
          {upgradePlanName
            ? `Upgrade to ${upgradePlanName} to unlock ${count} more advanced ${noun}`
            : `${pluralize(count, "more recommendation")} available on a higher plan`}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Your {planName} plan shows your top {visibleLimit} open recommendations in full.
          {parts.length > 0 && ` Locked: ${parts.join(", ")}`}
          {categories.length > 0 && ` across ${categories.join(", ")}`}
          {parts.length > 0 && "."}
        </p>
      </div>
      <Button asChild className="shrink-0">
        <Link href="/billing#plans" onClick={() => trackClient("upgrade_clicked", { source: "recommendations_locked", locked: count })}>
          See plans
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </Card>
  );
}
