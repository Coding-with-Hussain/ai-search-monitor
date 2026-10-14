import type { SubscriptionStatus } from "@/lib/billing/entitlements";
import { formatDate } from "@/lib/format";
import { daysUntil } from "@/services/billing/status";

/**
 * How the account's subscription is described in the UI (badge + schedule
 * line). Pure and isomorphic so server pages and client components agree.
 */

export type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger";

export interface BillingState {
  status: SubscriptionStatus;
  active: boolean;
  isTrial: boolean;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  /** A Stripe subscription is on file (any status). */
  hasStripeSubscription: boolean;
  /** Stripe billing period end (null when not billed through Stripe). */
  currentPeriodEnd: Date | null;
}

export function statusBadge(state: BillingState, now = new Date()): { label: string; variant: BadgeVariant } {
  if (state.status === "trialing") {
    if (!state.active) return { label: "Trial ended", variant: "danger" };
    if (state.cancelAtPeriodEnd) return { label: "Trial · cancels", variant: "warning" };
    return state.hasStripeSubscription ? { label: "Trial", variant: "default" } : { label: "Free trial", variant: "default" };
  }
  if (state.status === "active") {
    if (state.cancelAtPeriodEnd && state.currentPeriodEnd && state.currentPeriodEnd > now) {
      return { label: "Cancels soon", variant: "warning" };
    }
    return { label: "Active", variant: "success" };
  }
  const map: Record<Exclude<SubscriptionStatus, "trialing" | "active">, { label: string; variant: BadgeVariant }> = {
    past_due: { label: "Past due", variant: "warning" },
    unpaid: { label: "Unpaid", variant: "danger" },
    canceled: { label: "Canceled", variant: "danger" },
    incomplete: { label: "Payment incomplete", variant: "warning" },
    incomplete_expired: { label: "Expired", variant: "danger" },
    paused: { label: "Paused", variant: "secondary" },
  };
  return map[state.status];
}

/** One-line description of what happens next with the subscription. */
export function scheduleLine(state: BillingState, now = new Date()): string {
  const end = state.currentPeriodEnd;
  switch (state.status) {
    case "trialing": {
      if (!state.trialEndsAt) return "Free trial";
      if (!state.active) return `Your trial ended on ${formatDate(state.trialEndsAt)}.`;
      const days = daysUntil(state.trialEndsAt, now);
      const left = `${days} day${days === 1 ? "" : "s"} left`;
      if (state.hasStripeSubscription) {
        return state.cancelAtPeriodEnd
          ? `Trial ends ${formatDate(state.trialEndsAt)} (${left}) and won't renew.`
          : `Trial ends ${formatDate(state.trialEndsAt)} (${left}). Your first payment is taken then.`;
      }
      return `Trial ends ${formatDate(state.trialEndsAt)} (${left}). No card required until you choose a plan.`;
    }
    case "active":
      if (!state.hasStripeSubscription || !end) return "This plan isn't billed through Stripe, so there is no renewal date.";
      return state.cancelAtPeriodEnd
        ? `Cancels on ${formatDate(end)}. You keep full access until then.`
        : `Renews on ${formatDate(end)}.`;
    case "past_due":
      return "Your last payment failed. Update your payment method to keep monitoring.";
    case "unpaid":
      return "Payments failed repeatedly. Update your payment method to resume monitoring.";
    case "incomplete":
      return "Your first payment hasn't completed yet. Finish it in the billing portal or choose a plan again.";
    case "incomplete_expired":
      return "The first payment wasn't completed in time. Choose a plan to start again.";
    case "canceled":
      return "Your subscription has ended. Choose a plan to resume monitoring.";
    case "paused":
      return "Your subscription is paused. Resume it in the billing portal to continue monitoring.";
  }
}
