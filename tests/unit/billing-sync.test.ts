import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { planFromPrice } from "@/lib/billing/stripe";
import { pickCurrentSubscription } from "@/services/billing/account";
import { isLiveStatus, mapStripeStatus, trialCarryOverEnd } from "@/services/billing/status";
import { isSubscriptionStart, resolveSubscriptionPlan, shouldApplySubscription, subscriptionToRowValues } from "@/services/billing/sync";
import { invoiceSubscriptionId } from "@/services/billing/webhooks";

const NOW = new Date("2026-10-15T00:00:00Z");
const unix = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

function price(lookupKey: string | null, interval: "month" | "year" = "month") {
  return { id: `price_${lookupKey ?? "other"}`, lookup_key: lookupKey, recurring: { interval }, metadata: {} } as unknown as Stripe.Price;
}

function subscription(over: Partial<Stripe.Subscription> & { price?: Stripe.Price } = {}) {
  const p = over.price ?? price("aivm_growth_monthly");
  return {
    id: "sub_123",
    status: "active",
    customer: "cus_123",
    metadata: {},
    cancel_at_period_end: false,
    cancel_at: null,
    trial_end: null,
    created: unix("2026-10-01T00:00:00Z"),
    items: {
      data: [
        {
          id: "si_1",
          price: p,
          current_period_start: unix("2026-10-01T00:00:00Z"),
          current_period_end: unix("2026-11-01T00:00:00Z"),
        },
      ],
    },
    ...over,
  } as unknown as Stripe.Subscription;
}

describe("Stripe price → plan mapping", () => {
  it("maps lookup keys to plan and interval", () => {
    expect(planFromPrice(price("aivm_pro_yearly", "year"))).toEqual({ plan: "pro", interval: "year" });
    expect(planFromPrice(price("aivm_starter_monthly"))).toEqual({ plan: "starter", interval: "month" });
    expect(planFromPrice(price("someone_elses_price"))).toBeNull();
    expect(planFromPrice(null)).toBeNull();
  });
});

describe("subscription sync mapping", () => {
  it("maps an active subscription to row values (periods come from the item)", () => {
    const row = subscriptionToRowValues(subscription());
    expect(row).toMatchObject({
      plan: "growth",
      status: "active",
      billingInterval: "month",
      stripeSubscriptionId: "sub_123",
      stripeCustomerId: "cus_123",
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
    });
    expect(row.currentPeriodStart?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(row.currentPeriodEnd?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("keeps a Stripe trial end only while trialing and flags scheduled cancellation", () => {
    const trial = subscriptionToRowValues(subscription({ status: "trialing", trial_end: unix("2026-10-20T00:00:00Z") }));
    expect(trial.trialEndsAt?.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    const cancelling = subscriptionToRowValues(subscription({ cancel_at: unix("2026-11-01T00:00:00Z") }));
    expect(cancelling.cancelAtPeriodEnd).toBe(true);
  });

  it("prefers the price over stale checkout metadata, falling back to metadata", () => {
    const switched = resolveSubscriptionPlan(subscription({ price: price("aivm_agency_yearly", "year"), metadata: { plan: "starter", interval: "month" } }));
    expect(switched).toEqual({ plan: "agency", interval: "year", source: "price" });
    const unknownPrice = resolveSubscriptionPlan(subscription({ price: price(null, "year"), metadata: { plan: "pro" } }));
    expect(unknownPrice).toEqual({ plan: "pro", interval: "year", source: "metadata" });
    expect(resolveSubscriptionPlan(subscription({ price: price(null) }))).toBeNull();
  });

  it("treats unknown future Stripe statuses as non-granting", () => {
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("something_new")).toBe("incomplete");
    expect(isLiveStatus("past_due")).toBe(true);
    expect(isLiveStatus("canceled")).toBe(false);
  });
});

describe("which events may change the account", () => {
  const current = { stripeSubscriptionId: "sub_old", status: "active" as const };

  it("always applies updates to the subscription on file (including cancellation)", () => {
    expect(shouldApplySubscription(current, { stripeSubscriptionId: "sub_old", status: "canceled" })).toBe(true);
  });

  it("never lets a stale or unpaid different subscription downgrade the account", () => {
    expect(shouldApplySubscription(current, { stripeSubscriptionId: "sub_new", status: "incomplete" })).toBe(false);
    expect(shouldApplySubscription(current, { stripeSubscriptionId: "sub_new", status: "canceled" })).toBe(false);
    expect(shouldApplySubscription(current, { stripeSubscriptionId: "sub_new", status: "active" })).toBe(true);
  });

  it("detects the start of a paid subscription for analytics", () => {
    expect(isSubscriptionStart({ stripeSubscriptionId: null, status: "trialing" }, { stripeSubscriptionId: "sub_1", status: "active" })).toBe(true);
    expect(isSubscriptionStart({ stripeSubscriptionId: "sub_1", status: "incomplete" }, { stripeSubscriptionId: "sub_1", status: "active" })).toBe(true);
    expect(isSubscriptionStart({ stripeSubscriptionId: "sub_1", status: "active" }, { stripeSubscriptionId: "sub_1", status: "active" })).toBe(false);
    expect(isSubscriptionStart({ stripeSubscriptionId: null, status: "trialing" }, { stripeSubscriptionId: "sub_1", status: "incomplete" })).toBe(false);
  });

  it("picks the best current subscription for a customer", () => {
    const subs = [
      { id: "a", status: "canceled", created: 3 },
      { id: "b", status: "past_due", created: 2 },
      { id: "c", status: "active", created: 1 },
      { id: "d", status: "active", created: 5 },
    ] as Array<Pick<Stripe.Subscription, "status" | "created"> & { id: string }>;
    expect(pickCurrentSubscription(subs)?.id).toBe("d");
    expect(pickCurrentSubscription([{ id: "x", status: "canceled", created: 1 }] as typeof subs)).toBeNull();
  });
});

describe("misc billing helpers", () => {
  it("reads the subscription id from an invoice (current API shape)", () => {
    const invoice = { parent: { subscription_details: { subscription: "sub_9" } } } as unknown as Stripe.Invoice;
    expect(invoiceSubscriptionId(invoice)).toBe("sub_9");
    expect(invoiceSubscriptionId({ parent: null } as unknown as Stripe.Invoice)).toBeNull();
  });

  it("carries the remaining free trial into checkout only when enough is left", () => {
    const base = { isTrial: true, hasStripeSubscription: false };
    expect(trialCarryOverEnd({ ...base, trialEndsAt: new Date("2026-10-25T00:00:00Z") }, NOW)?.toISOString()).toBe("2026-10-25T00:00:00.000Z");
    expect(trialCarryOverEnd({ ...base, trialEndsAt: new Date("2026-10-16T00:00:00Z") }, NOW)).toBeNull();
    expect(trialCarryOverEnd({ ...base, hasStripeSubscription: true, trialEndsAt: new Date("2026-10-25T00:00:00Z") }, NOW)).toBeNull();
  });
});
