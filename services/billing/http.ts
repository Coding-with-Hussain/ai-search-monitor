import "server-only";

import { env } from "@/lib/env";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import type { BillingErrorCode } from "./errors";

/**
 * Helpers for the billing route handlers, which are plain HTML form POSTs
 * that answer with 303 redirects.
 */

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * CSRF defence for cookie-authenticated form posts: the browser-set Origin
 * (or Referer) must point at this app. Cross-site pages cannot forge these
 * headers, so a request from another site is rejected even though the
 * session cookie would be sent with it.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const source = origin && origin !== "null" ? origin : request.headers.get("referer");
  const sourceHost = hostOf(source);
  if (!sourceHost) return false;

  const allowed = new Set<string>();
  const add = (host: string | null | undefined) => {
    const h = host?.split(",")[0]?.trim().toLowerCase();
    if (h) allowed.add(h);
  };
  add(request.headers.get("host"));
  add(request.headers.get("x-forwarded-host"));
  add(hostOf(request.url));
  add(hostOf(env().NEXT_PUBLIC_APP_URL));
  return allowed.has(sourceHost);
}

/** 303 See Other: the browser follows with a GET (relative paths stay on the current host). */
export function seeOther(location: string) {
  return new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });
}

export function billingErrorRedirect(code: BillingErrorCode) {
  return seeOther(`/billing?error=${code}`);
}

/** Map a failure to a `?error=` code for the billing page (details are logged, never shown). */
export function billingErrorCodeFor(error: unknown, fallback: BillingErrorCode, name: string): BillingErrorCode {
  if (isAppError(error)) {
    if (error.code === "RATE_LIMITED") return "rate_limited";
    if (error.code === "NOT_CONFIGURED") {
      return error.details?.reason === "price_missing" ? "price_unavailable" : "stripe_not_configured";
    }
    if (error.code === "UNAUTHORIZED") return "invalid_request";
  }
  const err = error as { type?: string; code?: string; message?: string } | null;
  logger.error(`${name}.failed`, { type: err?.type, code: err?.code, error: err?.message });
  return fallback;
}
