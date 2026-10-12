"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackClient } from "@/lib/analytics/client";
import {
  ANNUAL_DISCOUNT,
  type BillingInterval,
  cyclePrice,
  displayMonthlyPrice,
  PLAN_IDS,
  PLANS,
  type PlanId,
  TRIAL_DAYS,
} from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

/**
 * Pricing cards with a monthly/annual toggle.
 *
 *  - mode "marketing": CTAs link to /signup?plan=…&interval=…
 *  - mode "billing":   CTAs POST to /api/billing/checkout (form fields: plan, interval),
 *                      which redirects to Stripe Checkout. Disabled with an
 *                      explanation when Stripe is not configured.
 */
export function PricingTable({
  mode = "marketing",
  currentPlan,
  currentInterval,
  subscriptionActive = false,
  checkoutEnabled = false,
  checkoutDisabledReason,
  defaultInterval = "month",
}: {
  mode?: "marketing" | "billing";
  currentPlan?: PlanId;
  currentInterval?: BillingInterval | null;
  subscriptionActive?: boolean;
  checkoutEnabled?: boolean;
  checkoutDisabledReason?: string;
  defaultInterval?: BillingInterval;
}) {
  const [interval, setInterval] = useState<BillingInterval>(defaultInterval);

  return (
    <div>
      <div className="mb-8 flex flex-col items-center gap-2">
        <div role="group" aria-label="Billing interval" className="inline-flex rounded-full border border-border bg-surface p-1 shadow-card">
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              aria-pressed={interval === i}
              onClick={() => setInterval(i)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                interval === i && "bg-foreground text-background",
              )}
            >
              {i === "month" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Annual billing saves {Math.round(ANNUAL_DISCOUNT * 100)}%.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_IDS.map((id) => {
          const plan = PLANS[id];
          const price = displayMonthlyPrice(plan, interval);
          const isCurrent = mode === "billing" && subscriptionActive && currentPlan === id && (currentInterval ?? "month") === interval;
          return (
            <div
              key={id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-surface p-6 shadow-card",
                plan.popular ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
              )}
              data-testid={`plan-${id}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{plan.name}</h3>
                {plan.popular && <Badge>Most popular</Badge>}
                {isCurrent && <Badge variant="success">Current plan</Badge>}
              </div>
              <p className="mt-1.5 min-h-10 text-[13px] text-muted-foreground">{plan.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">${price % 1 === 0 ? price : price.toFixed(2)}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="mt-1 h-4 text-xs text-subtle-foreground">
                {interval === "year" ? `$${cyclePrice(plan, "year")} billed yearly` : "Billed monthly"}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {mode === "marketing" ? (
                  <Button asChild className="w-full" variant={plan.popular ? "default" : "outline"}>
                    <Link href={`/signup?plan=${id}&interval=${interval}`} onClick={() => trackClient("upgrade_clicked", { plan: id, interval, source: "pricing" })}>
                      Start {TRIAL_DAYS}-day free trial
                    </Link>
                  </Button>
                ) : isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current plan
                  </Button>
                ) : (
                  <form action="/api/billing/checkout" method="POST" onSubmit={() => trackClient("upgrade_clicked", { plan: id, interval, source: "billing" })}>
                    <input type="hidden" name="plan" value={id} />
                    <input type="hidden" name="interval" value={interval} />
                    <Button type="submit" className="w-full" variant={plan.popular ? "default" : "outline"} disabled={!checkoutEnabled} title={checkoutEnabled ? undefined : checkoutDisabledReason}>
                      {subscriptionActive ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {mode === "billing" && !checkoutEnabled && checkoutDisabledReason && (
        <p className="mt-4 text-center text-xs text-muted-foreground">{checkoutDisabledReason}</p>
      )}
    </div>
  );
}
