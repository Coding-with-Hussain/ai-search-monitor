import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db";
import { stripeEvents } from "@/db/schema";
import { getStripe } from "@/lib/billing/stripe";
import { env, features } from "@/lib/env";
import { logger } from "@/lib/logger";
import { handleStripeEvent } from "@/services/billing/webhooks";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 *
 * Verifies the Stripe signature against the raw body, records the event id
 * for idempotency and applies it. Unexpected failures answer 500 (and forget
 * the event id) so Stripe retries the delivery.
 */
export async function POST(request: Request) {
  if (!features.stripeWebhooks()) {
    return Response.json({ error: "Stripe webhooks are not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, env().STRIPE_WEBHOOK_SECRET as string);
  } catch {
    logger.warn("stripe.webhook.invalid_signature");
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  let firstDelivery: boolean;
  try {
    const inserted = await db()
      .insert(stripeEvents)
      .values({ id: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ id: stripeEvents.id });
    firstDelivery = inserted.length > 0;
  } catch (error) {
    logger.error("stripe.webhook.store_failed", { eventId: event.id, type: event.type, error: (error as Error).message });
    return Response.json({ error: "Temporarily unavailable." }, { status: 500 });
  }
  if (!firstDelivery) {
    logger.info("stripe.webhook.duplicate", { eventId: event.id, type: event.type });
    return Response.json({ received: true, duplicate: true });
  }

  try {
    const handled = await handleStripeEvent(event);
    logger.info("stripe.webhook.processed", { eventId: event.id, type: event.type, handled });
    return Response.json({ received: true });
  } catch (error) {
    logger.error("stripe.webhook.failed", { eventId: event.id, type: event.type, error: (error as Error).message });
    // Forget the event so Stripe's retry is processed instead of being treated as a duplicate.
    await db()
      .delete(stripeEvents)
      .where(eq(stripeEvents.id, event.id))
      .catch((cleanupError: unknown) => {
        logger.error("stripe.webhook.cleanup_failed", { eventId: event.id, error: (cleanupError as Error).message });
      });
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
