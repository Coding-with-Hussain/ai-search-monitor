import "server-only";

import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { z } from "zod";

import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import type { SubscriptionStatus } from "@/lib/billing/entitlements";
import { type BillingInterval, isPlanId, type PlanId } from "@/lib/billing/plans";
import { planFromPrice, stripeId } from "@/lib/billing/stripe";
import { logger } from "@/lib/logger";

import { ADOPTABLE_STATUSES, mapStripeStatus } from "./status";

/**
 * Stripe subscription -> `subscriptions` row synchronisation.
 *
 * Stripe is the source of truth for paid billing state: this module is only
 * ever fed objects that came from Stripe (verified webhooks or API reads),
 * never from the browser. The mapping helpers are pure and exported for unit
 * tests; `syncSubscription` applies them to the database.
 */

type SubscriptionInput = Pick<
  Stripe.Subscription,
  "id" | "status" | "customer" | "items" | "metadata" | "cancel_at_period_end" | "cancel_at" | "trial_end"
>;

/** Values written to the `subscriptions` row for a Stripe subscription. */
export interface SubscriptionRowValues {
  /** null = the price is not one of ours and the metadata has no plan: keep the stored plan. */
  plan: PlanId | null;
  status: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  stripePriceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
}

const fromUnix = (seconds: number | null | undefined) =>
  typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : null;

/** The item that carries one of our plan prices (falls back to the first item). */
export function primarySubscriptionItem(sub: Pick<Stripe.Subscription, "items">): Stripe.SubscriptionItem | null {
  const items = sub.items?.data ?? [];
  return items.find((item) => planFromPrice(item.price) !== null) ?? items[0] ?? null;
}

/**
 * Plan + interval for a subscription. The price mapping wins because plan
 * changes made in the billing portal swap the price but keep the original
 * checkout metadata; metadata is only a fallback.
 */
export function resolveSubscriptionPlan(
  sub: Pick<Stripe.Subscription, "items" | "metadata">,
): { plan: PlanId; interval: BillingInterval | null; source: "price" | "metadata" } | null {
  const item = primarySubscriptionItem(sub);
  const fromPrice = item ? planFromPrice(item.price) : null;
  if (fromPrice) return { ...fromPrice, source: "price" };

  const metaPlan = sub.metadata?.plan;
  if (isPlanId(metaPlan)) {
    const metaInterval = sub.metadata?.interval;
    const recurring = item?.price?.recurring?.interval;
    const interval: BillingInterval | null =
      metaInterval === "month" || metaInterval === "year" ? metaInterval : recurring === "month" || recurring === "year" ? recurring : null;
    return { plan: metaPlan, interval, source: "metadata" };
  }
  return null;
}

/** Pure mapping of a Stripe subscription to our row values. */
export function subscriptionToRowValues(sub: SubscriptionInput): SubscriptionRowValues {
  const status = mapStripeStatus(sub.status);
  const item = primarySubscriptionItem(sub);
  const resolved = resolveSubscriptionPlan(sub);
  const recurring = item?.price?.recurring?.interval;
  return {
    plan: resolved?.plan ?? null,
    status,
    billingInterval: resolved?.interval ?? (recurring === "month" || recurring === "year" ? recurring : null),
    stripeSubscriptionId: sub.id,
    stripeCustomerId: stripeId(sub.customer),
    stripePriceId: item?.price?.id ?? null,
    currentPeriodStart: fromUnix(item?.current_period_start),
    currentPeriodEnd: fromUnix(item?.current_period_end),
    // Newer API versions may schedule the cancellation with `cancel_at` instead of the boolean.
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    // Only a Stripe trial keeps a trial end; once paid (or canceled) the free-trial date no longer applies.
    trialEndsAt: status === "trialing" ? fromUnix(sub.trial_end) : null,
  };
}

interface AccountBillingState {
  stripeSubscriptionId: string | null;
  status: SubscriptionStatus;
}

/**
 * Whether an incoming Stripe subscription may update the account. Updates to
 * the subscription already on file always apply (including cancellation).
 * A different subscription replaces it only when it is in good standing, so a
 * stale event for an old or abandoned subscription never downgrades the
 * account, and an unpaid first attempt never cuts a free trial short.
 */
export function shouldApplySubscription(current: AccountBillingState, incoming: Pick<SubscriptionRowValues, "stripeSubscriptionId" | "status">) {
  if (current.stripeSubscriptionId === incoming.stripeSubscriptionId) return true;
  return ADOPTABLE_STATUSES.includes(incoming.status);
}

/** True when this sync starts a new paid subscription on the account (analytics: subscription_started). */
export function isSubscriptionStart(current: AccountBillingState, incoming: Pick<SubscriptionRowValues, "stripeSubscriptionId" | "status">) {
  const good = incoming.status === "active" || incoming.status === "trialing";
  if (!good) return false;
  if (current.stripeSubscriptionId !== incoming.stripeSubscriptionId) return true;
  // Same subscription becoming active after an incomplete first payment.
  return current.status === "incomplete";
}

export interface SyncResult {
  applied: boolean;
  userId: string | null;
  reason?: "account_not_found" | "superseded";
  started?: boolean;
  plan?: PlanId;
  status?: SubscriptionStatus;
  previousStatus?: SubscriptionStatus;
}

const uuid = z.uuid();

/**
 * Apply a Stripe subscription to the matching account (by Stripe customer id,
 * then by the user id we stored in Checkout/subscription metadata). Runs in a
 * transaction with a row lock so concurrent webhooks for the same account
 * serialise.
 */
export async function syncSubscription(input: {
  userId?: string | null;
  customerId: string | null;
  subscription: SubscriptionInput;
}): Promise<SyncResult> {
  const values = subscriptionToRowValues(input.subscription);
  const customerId = input.customerId ?? values.stripeCustomerId;
  const metaUser = input.userId ?? input.subscription.metadata?.userId ?? null;
  const userId = metaUser && uuid.safeParse(metaUser).success ? metaUser : null;

  if (!values.plan) {
    logger.error("billing.sync.unknown_price", {
      subscriptionId: values.stripeSubscriptionId,
      priceId: values.stripePriceId,
    });
  }

  return db().transaction(async (tx) => {
    let [row] = customerId
      ? await tx.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, customerId)).limit(1).for("update")
      : [];
    if (!row && userId) {
      [row] = await tx.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1).for("update");
    }
    if (!row) {
      logger.warn("billing.sync.account_not_found", { subscriptionId: values.stripeSubscriptionId });
      return { applied: false, userId: null, reason: "account_not_found" } satisfies SyncResult;
    }

    if (!shouldApplySubscription(row, values)) {
      logger.info("billing.sync.superseded", {
        userId: row.userId,
        subscriptionId: values.stripeSubscriptionId,
        status: values.status,
      });
      // Still remember the customer so the billing portal works.
      if (customerId && !row.stripeCustomerId) {
        await tx.update(subscriptions).set({ stripeCustomerId: customerId }).where(eq(subscriptions.id, row.id));
      }
      return { applied: false, userId: row.userId, reason: "superseded" } satisfies SyncResult;
    }

    await tx
      .update(subscriptions)
      .set({
        ...(values.plan ? { plan: values.plan } : {}),
        status: values.status,
        billingInterval: values.billingInterval,
        stripeCustomerId: customerId ?? row.stripeCustomerId,
        stripeSubscriptionId: values.stripeSubscriptionId,
        stripePriceId: values.stripePriceId,
        currentPeriodStart: values.currentPeriodStart,
        currentPeriodEnd: values.currentPeriodEnd,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        trialEndsAt: values.trialEndsAt,
      })
      .where(eq(subscriptions.id, row.id));

    const plan = values.plan ?? (isPlanId(row.plan) ? row.plan : undefined);
    logger.info("billing.sync.applied", {
      userId: row.userId,
      subscriptionId: values.stripeSubscriptionId,
      status: values.status,
      previousStatus: row.status,
      plan,
    });
    return {
      applied: true,
      userId: row.userId,
      started: isSubscriptionStart(row, values),
      plan,
      status: values.status,
      previousStatus: row.status,
    } satisfies SyncResult;
  });
}

/** Persist the Stripe customer id on the user's row (never overwrites a different existing binding). */
export async function rememberStripeCustomer(userId: string, customerId: string) {
  const [row] = await db()
    .select({ id: subscriptions.id, stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (!row || row.stripeCustomerId === customerId) return;
  if (row.stripeCustomerId) {
    logger.warn("billing.customer_mismatch", { userId });
    return;
  }
  await db().update(subscriptions).set({ stripeCustomerId: customerId }).where(eq(subscriptions.id, row.id));
}
