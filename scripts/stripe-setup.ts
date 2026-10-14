/**
 * Create (or update) the Stripe catalogue this app sells, idempotently:
 *
 *   npm run stripe:setup            test mode (refuses live keys)
 *   npm run stripe:setup -- --live  allow a live-mode key (sk_live_…)
 *
 * For every plan in lib/billing/plans.ts it ensures:
 *   - a product with a stable id (aivm_<plan>) and metadata.plan
 *   - a monthly and a yearly price with lookup keys from stripeLookupKey()
 *     (a changed amount creates a new price and moves the lookup key to it)
 *   - a billing portal configuration that allows switching between the plans
 *
 * Safe to re-run: nothing is deleted, unchanged objects are left alone.
 */
import "./_env";

import Stripe from "stripe";

import { type BillingInterval, cyclePrice, PLAN_IDS, PLANS, type PlanId, stripeLookupKey } from "../lib/billing/plans";
import { STRIPE_APP_TAG, stripeProductId } from "../lib/billing/stripe";

const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

const INTERVALS: BillingInterval[] = ["month", "year"];

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function isMissing(error: unknown) {
  return error instanceof Stripe.errors.StripeError && (error.code === "resource_missing" || error.statusCode === 404);
}

function amountFor(plan: PlanId, interval: BillingInterval) {
  return Math.round(cyclePrice(PLANS[plan], interval) * 100);
}

async function ensureProduct(stripe: Stripe, plan: PlanId) {
  const id = stripeProductId(plan);
  const def = PLANS[plan];
  const desired = {
    name: `AI Search Visibility Monitor — ${def.name}`,
    description: def.tagline,
    metadata: { app: STRIPE_APP_TAG, plan },
  };
  try {
    const existing = await stripe.products.retrieve(id);
    const changed =
      existing.name !== desired.name ||
      existing.description !== desired.description ||
      existing.metadata?.plan !== plan ||
      existing.metadata?.app !== STRIPE_APP_TAG ||
      !existing.active;
    if (changed) {
      await stripe.products.update(id, { ...desired, active: true });
      console.log(`  ↻ product ${id} updated`);
    } else {
      console.log(`  ✓ product ${id}`);
    }
    return id;
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  await stripe.products.create({ id, ...desired });
  console.log(`  + product ${id} created`);
  return id;
}

async function ensurePrice(stripe: Stripe, plan: PlanId, interval: BillingInterval, productId: string) {
  const lookupKey = stripeLookupKey(plan, interval);
  const unitAmount = amountFor(plan, interval);
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const current = data[0];
  const productOf = (p: Stripe.Price) => (typeof p.product === "string" ? p.product : p.product.id);

  if (
    current &&
    current.unit_amount === unitAmount &&
    current.currency === "usd" &&
    current.recurring?.interval === interval &&
    (current.recurring?.interval_count ?? 1) === 1 &&
    productOf(current) === productId
  ) {
    console.log(`  ✓ price ${lookupKey} (${current.id}) $${(unitAmount / 100).toFixed(2)}/${interval}`);
    return current.id;
  }

  const price = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: unitAmount,
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    nickname: `${PLANS[plan].name} ${interval === "year" ? "yearly" : "monthly"}`,
    metadata: { app: STRIPE_APP_TAG, plan, interval },
  });
  console.log(
    current
      ? `  ↻ price ${lookupKey} → ${price.id} $${(unitAmount / 100).toFixed(2)}/${interval} (previous ${current.id} keeps existing subscribers)`
      : `  + price ${lookupKey} (${price.id}) $${(unitAmount / 100).toFixed(2)}/${interval} created`,
  );
  return price.id;
}

async function ensurePortalConfiguration(stripe: Stripe, products: Array<{ product: string; prices: string[] }>, appUrl: string) {
  const isHttps = appUrl.startsWith("https://");
  const params: Stripe.BillingPortal.ConfigurationCreateParams = {
    name: "AI Search Visibility Monitor",
    metadata: { app: STRIPE_APP_TAG },
    business_profile: isHttps
      ? {
          headline: "Manage your AI Search Visibility Monitor subscription",
          privacy_policy_url: `${appUrl}/privacy`,
          terms_of_service_url: `${appUrl}/terms`,
        }
      : { headline: "Manage your AI Search Visibility Monitor subscription" },
    features: {
      customer_update: { enabled: true, allowed_updates: ["email", "name", "address", "tax_id"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: ["too_expensive", "missing_features", "switched_service", "unused", "other"],
        },
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price", "promotion_code"],
        proration_behavior: "create_prorations",
        products,
      },
    },
  };

  const { data } = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const existing = data.find((c) => c.metadata?.app === STRIPE_APP_TAG);
  if (existing) {
    await stripe.billingPortal.configurations.update(existing.id, {
      business_profile: params.business_profile,
      features: params.features,
      metadata: params.metadata,
    });
    console.log(`  ↻ billing portal configuration ${existing.id} updated`);
    return existing.id;
  }
  const created = await stripe.billingPortal.configurations.create(params);
  console.log(`  + billing portal configuration ${created.id} created`);
  return created.id;
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) fail("STRIPE_SECRET_KEY is not set. Add a test-mode key (sk_test_…) to .env.local first.");
  const live = key.startsWith("sk_live_") || key.startsWith("rk_live_");
  if (live && !process.argv.includes("--live")) {
    fail("STRIPE_SECRET_KEY is a LIVE key. Re-run with --live if you really want to create live products and prices.");
  }

  const stripe = new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: "AI Search Visibility Monitor setup" } });
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  console.log(`\nStripe setup — ${live ? "LIVE" : "test"} mode\n`);
  const portalProducts: Array<{ product: string; prices: string[] }> = [];
  for (const plan of PLAN_IDS) {
    console.log(`${PLANS[plan].name}`);
    const productId = await ensureProduct(stripe, plan);
    const prices: string[] = [];
    for (const interval of INTERVALS) prices.push(await ensurePrice(stripe, plan, interval, productId));
    portalProducts.push({ product: productId, prices });
  }

  console.log("\nBilling portal");
  const portalId = await ensurePortalConfiguration(stripe, portalProducts, appUrl);

  const webhookUrl = `${appUrl}/api/stripe/webhook`;
  console.log(`
✓ Catalogue ready. Checkout finds prices by lookup key; no price ids need to go in your env.
  (Optional) pin the portal configuration with STRIPE_PORTAL_CONFIGURATION_ID=${portalId}

Next steps
  1. Add a webhook endpoint in the Stripe dashboard (Developers → Webhooks):
       URL:    ${webhookUrl}
       Events: ${WEBHOOK_EVENTS.join(", ")}
     then set STRIPE_WEBHOOK_SECRET=whsec_… from the endpoint's signing secret.

  2. Local development — forward events with the Stripe CLI instead:
       stripe listen --forward-to localhost:3000/api/stripe/webhook \\
         --events ${WEBHOOK_EVENTS.join(",")}
     and set STRIPE_WEBHOOK_SECRET to the whsec_… it prints.

  3. Restart the app, open /billing and choose a plan (test card 4242 4242 4242 4242).
`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n✖ Stripe setup failed: ${message}\n`);
  process.exit(1);
});
