import Link from "next/link";

import { type BillingState, scheduleLine, statusBadge } from "@/components/billing/billing-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { UsageSummary } from "@/lib/billing/entitlements";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { SettingsSection } from "./settings-section";

/** Compact plan + usage summary with links to the billing page. */
export function BillingSummary({
  planName,
  state,
  usage,
}: {
  planName: string;
  state: BillingState;
  usage: UsageSummary;
}) {
  const badge = statusBadge(state);
  const ratio = usage.queriesLimit > 0 ? usage.queriesUsed / usage.queriesLimit : 1;
  const full = ratio >= 1;

  return (
    <SettingsSection
      id="billing"
      title="Billing"
      description="Your plan and this month's usage. Invoices and payment methods are managed on the billing page."
      footer={
        <>
          <Button asChild variant="ghost">
            <Link href="/billing#plans">Compare plans</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/billing">Go to billing</Link>
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold tracking-tight">{planName}</p>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <p className="-mt-3 text-[13px] text-muted-foreground">{scheduleLine(state)}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-medium">Queries this month</span>
              <span className="tabular text-muted-foreground">
                {formatNumber(usage.queriesUsed)} / {formatNumber(usage.queriesLimit)}
              </span>
            </div>
            <Progress
              value={Math.min(usage.queriesUsed, usage.queriesLimit)}
              max={usage.queriesLimit}
              label="Monthly query usage"
              className={cn("mt-2", full ? "bg-danger-soft" : ratio >= 0.8 ? "bg-warning-soft" : undefined)}
              indicatorClassName={full ? "bg-danger" : ratio >= 0.8 ? "bg-warning" : undefined}
            />
            {full && (
              <p className="mt-1.5 text-xs text-danger-text">
                You&apos;ve used {formatNumber(usage.queriesUsed)}/{formatNumber(usage.queriesLimit)} queries this month.
              </p>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-3 text-[13px] sm:block">
            <span className="font-medium">Projects</span>
            <span className="tabular text-muted-foreground sm:mt-1 sm:block">
              {formatNumber(usage.projectsUsed)} of {formatNumber(usage.projectsLimit)} used
            </span>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
