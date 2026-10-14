import type { SubscriptionStatus } from "@/lib/billing/entitlements";

/**
 * Pure subscription-status helpers shared by the Stripe sync, the billing
 * routes and the billing UI. No server-only imports, so they are unit-testable
 * and safe to use anywhere.
 */

export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
];

/** A Stripe subscription in one of these states still exists and is managed in the billing portal. */
export const LIVE_STATUSES: readonly SubscriptionStatus[] = ["active", "trialing", "past_due", "unpaid", "paused"];

/** States in which a *new* Stripe subscription may replace the account's current billing state. */
export const ADOPTABLE_STATUSES: readonly SubscriptionStatus[] = ["active", "trialing", "past_due"];

/** States after which a Stripe subscription can never become active again. */
export const TERMINAL_STATUSES: readonly SubscriptionStatus[] = ["canceled", "incomplete_expired"];

export function isLiveStatus(status: string | null | undefined): boolean {
  return Boolean(status && (LIVE_STATUSES as readonly string[]).includes(status));
}

/**
 * Map a Stripe subscription status to our enum. Unknown (future) statuses are
 * treated as "incomplete", which never grants access.
 */
export function mapStripeStatus(status: string): SubscriptionStatus {
  return (SUBSCRIPTION_STATUSES as readonly string[]).includes(status) ? (status as SubscriptionStatus) : "incomplete";
}

/** Stripe requires a Checkout trial end at least 48 hours in the future; keep a safety margin. */
const MIN_TRIAL_CARRY_OVER_MS = 49 * 3_600_000;

/**
 * When a user on the free (no-card) trial subscribes, the remaining trial days
 * carry over: Checkout starts the subscription in trial until the original
 * trial end, so the first charge happens then. Returns that date, or null when
 * the user is not on a free trial or too little of it is left.
 */
export function trialCarryOverEnd(
  account: { isTrial: boolean; hasStripeSubscription: boolean; trialEndsAt: Date | null },
  now = new Date(),
): Date | null {
  if (!account.isTrial || account.hasStripeSubscription || !account.trialEndsAt) return null;
  return account.trialEndsAt.getTime() - now.getTime() > MIN_TRIAL_CARRY_OVER_MS ? account.trialEndsAt : null;
}

/** Whole days from now until `date` (never negative). */
export function daysUntil(date: Date, now = new Date()) {
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 86_400_000));
}
