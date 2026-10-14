/**
 * `?error=` codes the billing route handlers redirect with, and the messages
 * the billing page shows for them. Isomorphic (no server-only imports).
 */

export const BILLING_ERROR_CODES = [
  "stripe_not_configured",
  "no_customer",
  "invalid_plan",
  "invalid_request",
  "price_unavailable",
  "rate_limited",
  "checkout_failed",
  "portal_failed",
  "unavailable",
] as const;

export type BillingErrorCode = (typeof BILLING_ERROR_CODES)[number];

export function isBillingErrorCode(value: unknown): value is BillingErrorCode {
  return typeof value === "string" && (BILLING_ERROR_CODES as readonly string[]).includes(value);
}

export const BILLING_ERROR_MESSAGES: Record<BillingErrorCode, { title: string; message: string }> = {
  stripe_not_configured: {
    title: "Billing isn't configured",
    message: "Billing isn't configured in this environment. Set STRIPE_SECRET_KEY to enable checkout.",
  },
  no_customer: {
    title: "No billing account yet",
    message: "Invoices and payment methods become available after you subscribe. Choose a plan below to get started.",
  },
  invalid_plan: {
    title: "That plan couldn't be selected",
    message: "Please choose one of the plans below and try again.",
  },
  invalid_request: {
    title: "Request couldn't be verified",
    message: "For your security, billing changes must start from this page. Please try again.",
  },
  price_unavailable: {
    title: "Plan not available yet",
    message: "This plan can't be purchased right now. Please try again later or contact support.",
  },
  rate_limited: {
    title: "Too many attempts",
    message: "You've opened billing several times in a short period. Please wait a few minutes and try again.",
  },
  checkout_failed: {
    title: "Checkout couldn't start",
    message: "We couldn't reach our payment provider. No changes were made — please try again in a moment.",
  },
  portal_failed: {
    title: "Billing portal unavailable",
    message: "We couldn't open the billing portal. Please try again in a moment.",
  },
  unavailable: {
    title: "Billing is temporarily unavailable",
    message: "Something went wrong on our side. No changes were made — please try again in a moment.",
  },
};
