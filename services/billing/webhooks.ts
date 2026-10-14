import "server-only";

import { and, eq, gte, isNull } from "drizzle-orm";
import type Stripe from "stripe";
import { z } from "zod";

import { db } from "@/db";
import { notifications, subscriptions } from "@/db/schema";
import { getPlan } from "@/lib/billing/plans";
import { getStripe, isMissingResourceError, stripeId } from "@/lib/billing/stripe";
import { logger } from "@/lib/logger";

import { rememberStripeCustomer, syncSubscription, trackSubscriptionStart } from "./sync";

/**
 * Stripe webhook event handling. The route verifies the signature and
 * de-duplicates events; this module applies them. Handlers re-read the
 * subscription from Stripe so out-of-order deliveries always converge on the
 * latest state. Any thrown error makes the route answer 500 so Stripe retries.
 */

export const HANDLED_STRIPE_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

export const PAYMENT_FAILED_NOTIFICATION_TYPE = "billing_payment_failed";

const uuid = z.uuid();
const validUserId = (value: string | null | undefined) => (value && uuid.safeParse(value).success ? value : null);

/** Latest state of a subscription; falls back to the event payload if Stripe no longer has it. */
async function freshSubscription(id: string, fallback?: Stripe.Subscription): Promise<Stripe.Subscription | null> {
  try {
    return await getStripe().subscriptions.retrieve(id);
  } catch (error) {
    if (isMissingResourceError(error)) return fallback ?? null;
    throw error;
  }
}

/** Subscription that generated an invoice (API 2025+: `invoice.parent.subscription_details.subscription`). */
export function invoiceSubscriptionId(invoice: Pick<Stripe.Invoice, "parent">): string | null {
  return stripeId(invoice.parent?.subscription_details?.subscription ?? null);
}

async function syncById(subscriptionId: string, eventType: string, opts: { userId?: string | null; fallback?: Stripe.Subscription } = {}) {
  const subscription = await freshSubscription(subscriptionId, opts.fallback);
  if (!subscription) {
    logger.warn("stripe.webhook.subscription_missing", { eventType });
    return null;
  }
  const result = await syncSubscription({
    userId: opts.userId ?? null,
    customerId: stripeId(subscription.customer),
    subscription,
  });
  await trackSubscriptionStart(result, eventType);
  return result;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventType: string) {
  if (session.mode !== "subscription") return;
  const userId = validUserId(session.client_reference_id) ?? validUserId(session.metadata?.userId);
  const customerId = stripeId(session.customer);
  if (userId && customerId) await rememberStripeCustomer(userId, customerId);

  const subscriptionId = stripeId(session.subscription);
  if (!subscriptionId) {
    logger.warn("stripe.webhook.checkout_without_subscription", { sessionId: session.id });
    return;
  }
  await syncById(subscriptionId, eventType, { userId });
}

async function userIdForCustomer(customerId: string | null, fallbackUserId: string | null) {
  if (customerId) {
    const [row] = await db()
      .select({ userId: subscriptions.userId })
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, customerId))
      .limit(1);
    if (row) return row.userId;
  }
  return fallbackUserId;
}

async function notifyPaymentFailed(userId: string, planName: string) {
  // Stripe retries failed payments several times; one unread reminder at a time is enough.
  const since = new Date(Date.now() - 3 * 86_400_000);
  const [existing] = await db()
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, PAYMENT_FAILED_NOTIFICATION_TYPE),
        isNull(notifications.readAt),
        gte(notifications.createdAt, since),
      ),
    )
    .limit(1);
  if (existing) return;
  await db().insert(notifications).values({
    userId,
    type: PAYMENT_FAILED_NOTIFICATION_TYPE,
    severity: "critical",
    title: "Payment failed — update your billing details",
    body: `We couldn't collect the payment for your ${planName} subscription. Update your payment method on the Billing page to keep monitoring without interruption.`,
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice, eventType: string) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId || !invoice.id) return;

  // Deliveries can arrive late: skip the alert if the invoice has been paid since.
  const latest = await getStripe().invoices.retrieve(invoice.id);
  if (latest.status === "paid" || latest.status === "void") {
    await syncById(subscriptionId, eventType);
    return;
  }

  const result = await syncById(subscriptionId, eventType);
  const customerId = stripeId(invoice.customer);
  const userId = result?.userId ?? (await userIdForCustomer(customerId, null));
  if (!userId) {
    logger.warn("stripe.webhook.payment_failed_unknown_account", { invoiceId: invoice.id });
    return;
  }

  // Stripe may not have flipped the subscription yet; the account is past due either way.
  if (result?.applied && result.status === "active") {
    await db()
      .update(subscriptions)
      .set({ status: "past_due" })
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.stripeSubscriptionId, subscriptionId)));
  }

  const [row] = await db().select({ plan: subscriptions.plan }).from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  await notifyPaymentFailed(userId, getPlan(row?.plan).name);
  logger.info("stripe.webhook.payment_failed_recorded", { userId, invoiceId: invoice.id });
}

/** Apply one verified Stripe event. Returns false for event types we ignore. */
export async function handleStripeEvent(event: Stripe.Event): Promise<boolean> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object, event.type);
      return true;

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      await syncById(sub.id, event.type, { fallback: sub });
      return true;
    }

    case "customer.subscription.deleted": {
      // The payload is the final state (status "canceled").
      const sub = event.data.object;
      const result = await syncSubscription({ customerId: stripeId(sub.customer), subscription: sub });
      await trackSubscriptionStart(result, event.type);
      return true;
    }

    case "invoice.paid": {
      const subscriptionId = invoiceSubscriptionId(event.data.object);
      if (subscriptionId) await syncById(subscriptionId, event.type);
      return true;
    }

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object, event.type);
      return true;

    default:
      return false;
  }
}
