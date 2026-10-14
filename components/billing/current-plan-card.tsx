import { ArrowDown } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { type BillingInterval, cyclePrice, displayMonthlyPrice, type Plan } from "@/lib/billing/plans";
import { formatCurrency, formatNumber } from "@/lib/format";

import { type BillingState, scheduleLine, statusBadge } from "./billing-status";
import { PortalButton } from "./portal-button";

const FREQUENCY_LABEL = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", manual: "Manual" } as const;

function priceText(plan: Plan, interval: BillingInterval | null, billed: boolean) {
  if (!billed) return null;
  const i = interval ?? "month";
  const monthly = displayMonthlyPrice(plan, i);
  const monthlyText = formatCurrency(monthly, monthly % 1 === 0 ? 0 : 2);
  return i === "year"
    ? `${monthlyText}/month · ${formatCurrency(cyclePrice(plan, "year"))} billed yearly`
    : `${monthlyText}/month · billed monthly`;
}

function frequencyList(plan: Plan) {
  const auto = plan.limits.monitoringFrequencies.filter((f) => f !== "manual");
  return auto.length ? `${auto.map((f) => FREQUENCY_LABEL[f]).join(", ")} or on demand` : "On demand";
}

/** Current plan, status, schedule (trial end / renewal / cancellation) and plan allowances. */
export function CurrentPlanCard({
  plan,
  state,
  interval,
  portalDisabledReason,
}: {
  plan: Plan;
  state: BillingState;
  interval: BillingInterval | null;
  /** null = the billing portal is available. */
  portalDisabledReason: string | null;
}) {
  const badge = statusBadge(state);
  const billed = state.hasStripeSubscription && state.status !== "canceled" && state.status !== "incomplete_expired";
  const price = priceText(plan, interval, billed);
  const competitors = plan.limits.competitorsPerProject;
  const history = plan.limits.historyDays;

  const allowances: Array<{ label: string; value: string }> = [
    { label: "Projects", value: formatNumber(plan.limits.projects) },
    { label: "Queries per month", value: formatNumber(plan.limits.queriesPerMonth) },
    { label: "Competitors per project", value: competitors === null ? "Unlimited" : formatNumber(competitors) },
    { label: "Automatic monitoring", value: frequencyList(plan) },
    { label: "History", value: history === null ? "Full history" : `${formatNumber(history)} days` },
    {
      label: "Reports",
      value: plan.features.whiteLabelReports ? "PDF, white-label" : plan.features.pdfReports ? "PDF reports" : "Online reports",
    },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[13px] font-medium text-muted-foreground">Current plan</h2>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{plan.name}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{price ?? plan.tagline}</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <p className="rounded-lg bg-surface-muted px-3 py-2.5 text-[13px] leading-snug text-foreground">{scheduleLine(state)}</p>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
          {allowances.map((a) => (
            <div key={a.label} className="flex items-baseline justify-between gap-3 border-b border-border pb-2 sm:block sm:border-0 sm:pb-0">
              <dt className="text-muted-foreground">{a.label}</dt>
              <dd className="tabular font-medium text-foreground sm:mt-0.5">{a.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
        <PortalButton disabledReason={portalDisabledReason} />
        <Button asChild variant="ghost" className="self-start">
          <Link href="#plans">
            Compare plans
            <ArrowDown aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
