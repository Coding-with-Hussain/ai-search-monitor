import "server-only";

import Stripe from "stripe";

import { env } from "@/lib/env";
import { AppError, notConfigured } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { type BillingInterval, isPlanId, PLAN_IDS, PLANS, type PlanId, stripeLookupKey } from "./plans";

/**
 * Stripe client + price mapping (server-only).
 *
 * Prices are resolved per plan/interval from, in order:
 *   1. an explicit env override `STRIPE_PRICE_<PLAN>_<MONTHLY|YEARLY>` (e.g. STRIPE_PRICE_GROWTH_YEARLY)
 *   2. the active price with lookup key `stripeLookupKey(plan, interval)` (created by `npm run stripe:setup`)
 *
 * The reverse mapping (price -> plan/interval) accepts env ids, lookup keys,
 * price metadata and our product ids, so subscriptions changed in the Stripe
 * dashboard or billing portal still map to the right plan.
 */

export const STRIPE_NOT_CONFIGURED_MESSAGE =
  "Billing isn't configured in this environment. Set STRIPE_SECRET_KEY to enable checkout.";

/** Metadata tag the setup script puts on every Stripe object it creates. */
export const STRIPE_APP_TAG = "aivm";

/** Deterministic Stripe product id for a plan (created by `npm run stripe:setup`). */
export function stripeProductId(plan: PlanId) {
  return `${STRIPE_APP_TAG}_${plan}`;
}

let client: Stripe | null = null;
let clientKey: string | null = null;

/** Lazily-created Stripe client. Throws a typed NOT_CONFIGURED error when the secret key is missing. */
export function getStripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw notConfigured(STRIPE_NOT_CONFIGURED_MESSAGE);
  if (!client || clientKey !== key) {
    client = new Stripe(key, {
      maxNetworkRetries: 2,
      timeout: 20_000,
      appInfo: { name: "AI Search Visibility Monitor" },
    });
    clientKey = key;
  }
  return client;
}

export function isStripeError(error: unknown): error is InstanceType<typeof Stripe.errors.StripeError> {
  return error instanceof Stripe.errors.StripeError;
}

/** True when Stripe reports that the referenced object does not exist (deleted customer, wrong mode, …). */
export function isMissingResourceError(error: unknown) {
  return isStripeError(error) && (error.code === "resource_missing" || error.statusCode === 404);
}

/** Id of an expandable Stripe field (`"cus_…"` or an expanded object). */
export function stripeId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

// ---------------------------------------------------------------------------
// Price resolution
// ---------------------------------------------------------------------------

export function priceEnvName(plan: PlanId, interval: BillingInterval) {
  return `STRIPE_PRICE_${plan.toUpperCase()}_${interval === "year" ? "YEARLY" : "MONTHLY"}`;
}

function envPriceId(plan: PlanId, interval: BillingInterval): string | undefined {
  const value = process.env[priceEnvName(plan, interval)]?.trim();
  return value ? value : undefined;
}

const PRICE_CACHE_TTL_MS = 10 * 60_000;
const priceCache = new Map<string, { id: string; expiresAt: number }>();

/** Stripe price id for a plan + interval. Throws NOT_CONFIGURED (reason price_missing) when no price exists. */
export async function resolvePriceId(plan: PlanId, interval: BillingInterval): Promise<string> {
  const fromEnv = envPriceId(plan, interval);
  if (fromEnv) return fromEnv;

  const lookupKey = stripeLookupKey(plan, interval);
  const cached = priceCache.get(lookupKey);
  if (cached && cached.expiresAt > Date.now()) return cached.id;

  const prices = await getStripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) {
    throw new AppError(
      "NOT_CONFIGURED",
      `The ${PLANS[plan].name} plan isn't available for purchase yet. Please try again later or contact support.`,
      503,
      { reason: "price_missing", lookupKey },
    );
  }
  priceCache.set(lookupKey, { id: price.id, expiresAt: Date.now() + PRICE_CACHE_TTL_MS });
  return price.id;
}

export interface PlanPrice {
  plan: PlanId;
  interval: BillingInterval;
}

const LOOKUP_KEY_PATTERN = new RegExp(`^${STRIPE_APP_TAG}_([a-z]+)_(monthly|yearly)$`);
const PRODUCT_ID_PATTERN = new RegExp(`^${STRIPE_APP_TAG}_([a-z]+)$`);

export type PriceLike = Pick<Stripe.Price, "id" | "lookup_key" | "metadata" | "recurring"> & {
  product?: Stripe.Price["product"];
};

function intervalFromRecurring(recurring: Stripe.Price["recurring"] | null | undefined): BillingInterval | null {
  if (!recurring) return null;
  if (recurring.interval === "year" && (recurring.interval_count ?? 1) === 1) return "year";
  if (recurring.interval === "month" && (recurring.interval_count ?? 1) === 1) return "month";
  return null;
}

/**
 * Map a Stripe price to our plan + interval, or null when it is not one of ours.
 * Accepts a full price object or a bare price id (env-configured or cached ids only).
 * Pure apart from reading env overrides and the in-memory price cache.
 */
export function planFromPrice(price: PriceLike | string | null | undefined): PlanPrice | null {
  if (!price) return null;
  const id = typeof price === "string" ? price : price.id;

  for (const plan of PLAN_IDS) {
    for (const interval of ["month", "year"] as const) {
      if (envPriceId(plan, interval) === id) return { plan, interval };
    }
  }
  if (typeof price === "string") {
    for (const [key, value] of priceCache) {
      if (value.id !== id) continue;
      const match = LOOKUP_KEY_PATTERN.exec(key);
      if (match && isPlanId(match[1])) return { plan: match[1], interval: match[2] === "yearly" ? "year" : "month" };
    }
    return null;
  }

  const match = price.lookup_key ? LOOKUP_KEY_PATTERN.exec(price.lookup_key) : null;
  if (match && isPlanId(match[1])) {
    return { plan: match[1], interval: match[2] === "yearly" ? "year" : "month" };
  }

  const interval = intervalFromRecurring(price.recurring);
  if (!interval) return null;

  const metaPlan = price.metadata?.plan;
  if (isPlanId(metaPlan)) return { plan: metaPlan, interval };

  const productId = stripeId(price.product as string | { id: string } | null | undefined);
  const productMatch = productId ? PRODUCT_ID_PATTERN.exec(productId) : null;
  if (productMatch && isPlanId(productMatch[1])) return { plan: productMatch[1], interval };

  return null;
}

// ---------------------------------------------------------------------------
// Billing portal configuration
// ---------------------------------------------------------------------------

const PORTAL_CACHE_TTL_MS = 10 * 60_000;
let portalConfigCache: { id: string | null; expiresAt: number } | null = null;

/**
 * Billing portal configuration created by `npm run stripe:setup` (it allows
 * switching between our plans). Falls back to the account's default portal
 * configuration (`null`) when none is found. Override with
 * STRIPE_PORTAL_CONFIGURATION_ID.
 */
export async function resolvePortalConfigurationId(): Promise<string | null> {
  const fromEnv = process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim();
  if (fromEnv) return fromEnv;
  if (portalConfigCache && portalConfigCache.expiresAt > Date.now()) return portalConfigCache.id;

  let id: string | null = null;
  try {
    const configs = await getStripe().billingPortal.configurations.list({ active: true, limit: 100 });
    id = configs.data.find((c) => c.metadata?.app === STRIPE_APP_TAG)?.id ?? null;
  } catch (error) {
    // Not fatal: the account's default configuration is used instead.
    logger.warn("billing.portal_config_lookup_failed", { error: (error as Error).message });
  }
  portalConfigCache = { id, expiresAt: Date.now() + PORTAL_CACHE_TTL_MS };
  return id;
}
