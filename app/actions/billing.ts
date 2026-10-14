"use server";

import { revalidatePath } from "next/cache";

import { runAction } from "@/lib/action-utils";
import { requireUserOrThrow } from "@/lib/auth/session";
import { features } from "@/lib/env";
import { notConfigured } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { STRIPE_NOT_CONFIGURED_MESSAGE } from "@/lib/billing/stripe";
import { refreshSubscriptionFromStripe } from "@/services/billing/account";

/**
 * Re-read the signed-in user's subscription from Stripe and apply it. Used
 * after Checkout so activation does not wait for the webhook, and by the
 * "Refresh status" button. Takes no input: the account comes from the session.
 */
export async function refreshBillingStatusAction() {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    if (!features.stripe()) throw notConfigured(STRIPE_NOT_CONFIGURED_MESSAGE);
    await enforceRateLimit(
      `billing:refresh:${user.id}`,
      20,
      600,
      "You've refreshed your billing status several times. Please wait a few minutes.",
    );
    const result = await refreshSubscriptionFromStripe(user.id);
    revalidatePath("/billing");
    revalidatePath("/", "layout");
    return { found: Boolean(result?.applied), status: result?.status ?? null, plan: result?.plan ?? null };
  }, "billing.refresh");
}
