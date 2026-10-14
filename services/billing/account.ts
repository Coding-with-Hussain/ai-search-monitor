import "server-only";

import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import type { BillingInterval, PlanId } from "@/lib/billing/plans";
import { getStripe, isMissingResourceError, resolvePortalConfigurationId, resolvePriceId } from "@/lib/billing/stripe";
import { appUrl, features } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { isLiveStatus, LIVE_STATUSES, mapStripeStatus, trialCarryOverEnd } from "./status";
import { syncSubscription, type SyncResult } from "./sync";

/**
 * Account-level billing operations against Stripe. Every function takes a
 * verified server-side user (never ids from the browser) and reads billing
 * state from the database or Stripe — never from the client.
 */

export async function getBillingRow(userId: string) {
  const [row] = await db().select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return row ?? null;
}

/**
 * Reuse the user's Stripe customer or create one, persisting
 * `stripe_customer_id`. A stored id that no longer exists in Stripe (deleted,
 * or created in the other mode) is replaced.
 */
export async function ensureStripeCustomer(user: SessionUser): Promise<string> {
  const stripe = getStripe();
  const row = await getBillingRow(user.id);
  if (!row) throw new AppError("NOT_FOUND", "We couldn't find your billing account. Please reload and try again.", 404);

  if (row.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(row.stripeCustomerId);
      if (!("deleted" in existing && existing.deleted)) return existing.id;
    } catch (error) {
      if (!isMissingResourceError(error)) throw error;
    }
    logger.warn("billing.customer_stale", { userId: user.id });
  }

  const customer = await stripe.customers.create(
    {
      email: user.email || undefined,
      name: user.fullName ?? undefined,
      metadata: { userId: user.id },
    },
    // Two quick clicks must not create two customers.
    { idempotencyKey: `customer:${user.id}:${row.stripeCustomerId ?? "new"}` },
  );
  await db().update(subscriptions).set({ stripeCustomerId: customer.id }).where(eq(subscriptions.id, row.id));
  logger.info("billing.customer_created", { userId: user.id });
  return customer.id;
}

const STATUS_RANK: Record<string, number> = { active: 0, trialing: 1, past_due: 2, unpaid: 3, paused: 4, incomplete: 5 };

/**
 * The subscription that best represents the customer's billing state: live
 * subscriptions first (active > trialing > past_due > …), newest first.
 * Pure — exported for unit tests.
 */
export function pickCurrentSubscription<T extends Pick<Stripe.Subscription, "status" | "created">>(subs: readonly T[]): T | null {
  const ranked = subs
    .filter((s) => s.status in STATUS_RANK)
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.created - a.created);
  return ranked[0] ?? null;
}

async function listCustomerSubscriptions(customerId: string) {
  const result = await getStripe().subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  return result.data;
}

export type CheckoutOutcome = { kind: "checkout" | "portal"; url: string; trialCarriedOver?: boolean };

/**
 * Start a plan purchase. Customers who already have a live subscription are
 * sent to the billing portal instead (plan changes happen there), so an
 * account can never end up with two paid subscriptions from this flow.
 */
export async function startCheckout(user: SessionUser, plan: PlanId, interval: BillingInterval): Promise<CheckoutOutcome> {
  const stripe = getStripe();
  const [price, ent] = await Promise.all([resolvePriceId(plan, interval), getEntitlements(user.id)]);
  const customerId = await ensureStripeCustomer(user);

  // Ask Stripe (not our possibly-lagging copy) whether a subscription already exists.
  const subs = await listCustomerSubscriptions(customerId);
  const live = pickCurrentSubscription(subs.filter((s) => isLiveStatus(mapStripeStatus(s.status))));
  if (live) {
    // Heal our copy if a webhook was missed, then hand over to the portal.
    await syncSubscription({ userId: user.id, customerId, subscription: live }).catch((error: unknown) => {
      logger.warn("billing.checkout_sync_failed", { userId: user.id, error: (error as Error).message });
    });
    const portal = await createPortalSession(customerId);
    return { kind: "portal", url: portal.url };
  }

  // Remaining free-trial days carry over: the first charge happens when the trial would have ended.
  const trialEnd = trialCarryOverEnd({
    isTrial: ent.isTrial,
    hasStripeSubscription: ent.hasStripeSubscription,
    trialEndsAt: ent.trialEndsAt,
  });
  const metadata = { userId: user.id, plan, interval };
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    metadata,
    subscription_data: {
      metadata,
      ...(trialEnd ? { trial_end: Math.floor(trialEnd.getTime() / 1000) } : {}),
    },
    allow_promotion_codes: true,
    success_url: appUrl("/billing?checkout=success"),
    cancel_url: appUrl("/billing?checkout=cancelled"),
  });
  if (!session.url) throw new AppError("NOT_CONFIGURED", "Checkout couldn't be started. Please try again.", 503);
  logger.info("billing.checkout_started", { userId: user.id, plan, interval, trialCarriedOver: Boolean(trialEnd) });
  return { kind: "checkout", url: session.url, trialCarriedOver: Boolean(trialEnd) };
}

/** Stripe-hosted billing portal session (invoices, payment methods, plan changes, cancellation). */
export async function createPortalSession(customerId: string) {
  const configuration = await resolvePortalConfigurationId();
  return getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: appUrl("/billing"),
    ...(configuration ? { configuration } : {}),
  });
}

/**
 * Pull the customer's current subscription from Stripe and apply it. Used
 * right after Checkout (so activation does not depend on webhook latency) and
 * by the "Refresh status" button.
 */
export async function refreshSubscriptionFromStripe(userId: string): Promise<SyncResult | null> {
  const row = await getBillingRow(userId);
  if (!row?.stripeCustomerId) return null;
  const subs = await listCustomerSubscriptions(row.stripeCustomerId);
  const current =
    pickCurrentSubscription(subs) ??
    (row.stripeSubscriptionId ? (subs.find((s) => s.id === row.stripeSubscriptionId) ?? null) : null);
  if (!current) return null;
  return syncSubscription({ userId, customerId: row.stripeCustomerId, subscription: current });
}

/**
 * Before an account is deleted: cancel every subscription that could still
 * charge the customer. Throws (and the deletion stops) when that cannot be
 * guaranteed. The Stripe customer and its invoices are kept for accounting.
 */
export async function cancelSubscriptionsForDeletion(userId: string) {
  const row = await getBillingRow(userId);
  if (!row?.stripeCustomerId) return { canceled: 0 };

  if (!features.stripe()) {
    if (row.stripeSubscriptionId && isLiveStatus(row.status)) {
      throw new AppError(
        "CONFLICT",
        "Your paid subscription couldn't be canceled automatically right now. Please contact support so we can cancel it before deleting your account.",
        409,
      );
    }
    return { canceled: 0 };
  }

  const stripe = getStripe();
  const subs = await listCustomerSubscriptions(row.stripeCustomerId).catch((error: unknown) => {
    if (isMissingResourceError(error)) return [] as Stripe.Subscription[];
    throw error;
  });
  const chargeable = new Set<string>([...LIVE_STATUSES, "incomplete"]);
  let canceled = 0;
  for (const sub of subs) {
    if (!chargeable.has(sub.status)) continue;
    await stripe.subscriptions.cancel(sub.id, {
      cancellation_details: { comment: "Account deleted by the customer" },
    });
    canceled++;
  }
  logger.info("billing.subscriptions_canceled_for_deletion", { userId, canceled });
  return { canceled };
}
