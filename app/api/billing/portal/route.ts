import { requireUserOrThrow, type SessionUser } from "@/lib/auth/session";
import { isMissingResourceError } from "@/lib/billing/stripe";
import { features } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createPortalSession, getBillingRow } from "@/services/billing/account";
import { billingErrorCodeFor, billingErrorRedirect, isSameOriginRequest, seeOther } from "@/services/billing/http";

export const runtime = "nodejs";

/**
 * POST /api/billing/portal
 *
 * Opens the Stripe billing portal (invoices, payment methods, plan changes,
 * cancellation) for the signed-in user's Stripe customer with a 303.
 */
export async function POST(request: Request) {
  let user: SessionUser;
  try {
    user = await requireUserOrThrow();
  } catch {
    return seeOther(`/login?next=${encodeURIComponent("/billing")}`);
  }

  if (!isSameOriginRequest(request)) return billingErrorRedirect("invalid_request");
  if (!features.stripe()) return billingErrorRedirect("stripe_not_configured");

  let url: string;
  try {
    const row = await getBillingRow(user.id);
    if (!row?.stripeCustomerId) return billingErrorRedirect("no_customer");
    await enforceRateLimit(`billing:portal:${user.id}`, 20, 600);
    ({ url } = await createPortalSession(row.stripeCustomerId));
  } catch (error) {
    if (isMissingResourceError(error)) return billingErrorRedirect("no_customer");
    return billingErrorRedirect(billingErrorCodeFor(error, "portal_failed", "billing.portal"));
  }
  return seeOther(url);
}
