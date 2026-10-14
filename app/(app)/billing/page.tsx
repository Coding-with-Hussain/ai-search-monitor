import { Info, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/app/page-header";
import { BillingNotices } from "@/components/billing/billing-notices";
import type { BillingState } from "@/components/billing/billing-status";
import { CurrentPlanCard } from "@/components/billing/current-plan-card";
import { PricingTable } from "@/components/billing/pricing-table";
import { UsageCard } from "@/components/billing/usage-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getEntitlements, getUsageSummary } from "@/lib/billing/entitlements";
import { features } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { logger } from "@/lib/logger";
import { getBillingRow } from "@/services/billing/account";
import { daysUntil, isLiveStatus, trialCarryOverEnd } from "@/services/billing/status";

export const metadata: Metadata = { title: "Billing" };

const CHECKOUT_DISABLED_REASON = "Billing isn't configured in this environment. Set STRIPE_SECRET_KEY to enable checkout.";

function single(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v ? v.slice(0, 64) : null;
}

async function loadBilling(userId: string) {
  const ent = await getEntitlements(userId);
  const [usage, row] = await Promise.all([getUsageSummary(userId, ent), getBillingRow(userId)]);
  return { ent, usage, row };
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/billing");
  const params = await searchParams;
  const checkout = single(params.checkout);
  const error = single(params.error);

  let data: Awaited<ReturnType<typeof loadBilling>>;
  try {
    data = await loadBilling(user.id);
  } catch (err) {
    logger.error("billing.page_load_failed", { error: (err as Error).message });
    return (
      <>
        <PageHeader title="Billing" description="Your plan, usage and invoices." />
        <Alert
          variant="danger"
          title="We couldn't load your billing details"
          action={
            <Button asChild size="sm" variant="outline">
              <a href="/billing">Try again</a>
            </Button>
          }
        >
          Something went wrong on our side. Your subscription isn&apos;t affected.
        </Alert>
      </>
    );
  }

  const { ent, usage, row } = data;
  const stripeEnabled = features.stripe();
  const hasCustomer = Boolean(row?.stripeCustomerId);
  const liveStripe = Boolean(row?.stripeSubscriptionId) && isLiveStatus(ent.status);

  const state: BillingState = {
    status: ent.status,
    active: ent.active,
    isTrial: ent.isTrial,
    trialEndsAt: ent.trialEndsAt,
    cancelAtPeriodEnd: ent.cancelAtPeriodEnd,
    hasStripeSubscription: ent.hasStripeSubscription,
    currentPeriodEnd: row?.currentPeriodEnd ?? null,
  };

  const portalDisabledReason = !stripeEnabled
    ? "Billing isn't configured in this environment, so invoices and payment methods aren't available."
    : !hasCustomer
      ? "Invoices, receipts and payment methods appear here after you choose a plan."
      : null;

  const subscriptionActive = ent.active && (!ent.isTrial || ent.hasStripeSubscription);
  const carryOver = stripeEnabled ? trialCarryOverEnd(ent) : null;

  return (
    <>
      <PageHeader title="Billing" description="Your plan, usage and invoices. Payments are processed securely by Stripe." />

      <div className="flex flex-col gap-6">
        <BillingNotices
          checkout={checkout}
          error={error}
          state={state}
          planName={ent.plan.name}
          inactiveReason={ent.inactiveReason}
          canOpenPortal={hasCustomer && stripeEnabled}
          stripeEnabled={stripeEnabled}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <CurrentPlanCard
            plan={ent.plan}
            state={state}
            interval={row?.billingInterval ?? null}
            portalDisabledReason={portalDisabledReason}
          />
          <UsageCard usage={usage} planName={ent.plan.name} />
        </div>

        <section id="plans" aria-labelledby="plans-heading" className="scroll-mt-20 pt-4">
          <div className="mb-6 flex flex-col gap-1.5">
            <h2 id="plans-heading" className="text-lg font-semibold tracking-tight">
              {liveStripe ? "Change plan" : "Choose a plan"}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {liveStripe
                ? "Upgrades, downgrades, invoices and cancellation are handled in the secure Stripe billing portal. Changes are prorated automatically."
                : "Every plan monitors ChatGPT, Gemini and Perplexity. Cancel anytime."}
            </p>
          </div>

          {carryOver && (
            <Alert variant="info" className="mb-6" title="Your remaining trial carries over">
              You have {daysUntil(carryOver)} days left in your free trial. Subscribe now and your first payment is taken on{" "}
              {formatDate(carryOver)} — not today.
            </Alert>
          )}

          <PricingTable
            mode="billing"
            currentPlan={ent.plan.id}
            currentInterval={row?.billingInterval ?? null}
            subscriptionActive={subscriptionActive}
            checkoutEnabled={stripeEnabled}
            checkoutDisabledReason={CHECKOUT_DISABLED_REASON}
            defaultInterval={row?.billingInterval ?? "month"}
          />

          <div className="mt-8 grid gap-3 text-[13px] text-muted-foreground sm:grid-cols-2">
            <p className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
              <span>Card details are entered on Stripe&apos;s secure checkout page and never touch our servers.</span>
            </p>
            <p className="flex gap-2">
              <Info className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
              <span>
                One query is one buyer question checked in one scan, across all the AI platforms you monitor. Allowances
                reset every billing period.
              </span>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
