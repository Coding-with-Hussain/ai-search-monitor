"use client";

import type { AnalyticsEvent, AnalyticsProps } from "./events";

/** Browser analytics — fire-and-forget, never blocks UI. */
export function trackClient(event: AnalyticsEvent, props: AnalyticsProps = {}) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "development") console.debug("[analytics]", event, props);
    return;
  }
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");
  let distinctId = "anonymous";
  try {
    distinctId = localStorage.getItem("aivm_aid") ?? crypto.randomUUID();
    localStorage.setItem("aivm_aid", distinctId);
  } catch {
    // storage unavailable — keep anonymous id
  }
  const body = JSON.stringify({ api_key: key, event, distinct_id: distinctId, properties: { ...props, $current_url: location.href } });
  try {
    const queued = typeof navigator.sendBeacon === "function" && navigator.sendBeacon(`${host}/capture/`, body);
    if (!queued) {
      void fetch(`${host}/capture/`, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    // ignore analytics failures
  }
}
