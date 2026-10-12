import "server-only";

import { logger } from "@/lib/logger";

import type { AnalyticsEvent, AnalyticsProps } from "./events";

/**
 * Server-side analytics. Provider-agnostic: today it forwards to PostHog's
 * capture API when NEXT_PUBLIC_POSTHOG_KEY is set, otherwise it logs at debug
 * level. Swap the transport here to change providers. Never send secrets or
 * raw AI responses as properties.
 */
export async function track(event: AnalyticsEvent, distinctId: string, props: AnalyticsProps = {}) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    logger.debug("analytics.event", { event, ...props });
    return;
  }
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");
  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: key, event, distinct_id: distinctId, properties: { ...props, $lib: "server" } }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (error) {
    logger.debug("analytics.failed", { event, error: (error as Error).message });
  }
}
