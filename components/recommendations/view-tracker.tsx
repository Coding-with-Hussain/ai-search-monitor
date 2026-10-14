"use client";

import { useEffect, useRef } from "react";

import { trackClient } from "@/lib/analytics/client";

/** Fires `recommendation_viewed` once per page view (not on filter changes). */
export function RecommendationViewTracker({ projectId, openCount }: { projectId: string; openCount: number }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackClient("recommendation_viewed", { projectId, openCount });
    // Intentionally once per mount: later prop changes come from filtering, not a new view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
