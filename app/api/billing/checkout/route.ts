import { z } from "zod";

import { ensureUserRecords } from "@/db/repositories/profiles";
import { requireUserOrThrow, type SessionUser } from "@/lib/auth/session";
import { isPlanId } from "@/lib/billing/plans";
import { features } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { startCheckout } from "@/services/billing/account";
import { billingErrorCodeFor, billingErrorRedirect, isSameOriginRequest, seeOther } from "@/services/billing/http";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  plan: z.string().refine(isPlanId, "Choose a valid plan."),
  interval: z.enum(["month", "year"]),
});

/**
 * POST /api/billing/checkout (form fields: plan, interval)
 *
 * Starts Stripe Checkout for the signed-in user and answers 303 to the
 * Checkout page, or to the billing portal when the customer already has a
 * live subscription. Failures redirect to /billing?error=<code>.
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

  const form = await request.formData().catch(() => null);
  const parsed = checkoutSchema.safeParse({ plan: form?.get("plan"), interval: form?.get("interval") });
  if (!parsed.success || !isPlanId(parsed.data.plan)) return billingErrorRedirect("invalid_plan");

  let url: string;
  try {
    await enforceRateLimit(`billing:checkout:${user.id}`, 10, 600);
    await ensureUserRecords(user);
    ({ url } = await startCheckout(user, parsed.data.plan, parsed.data.interval));
  } catch (error) {
    return billingErrorRedirect(billingErrorCodeFor(error, "checkout_failed", "billing.checkout"));
  }
  return seeOther(url);
}
