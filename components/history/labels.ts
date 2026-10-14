import type { ScanStatus } from "@/types/domain";

/** Client-safe labels shared by the History and Reports areas. */

export type ScanTrigger = "manual" | "scheduled" | "onboarding" | "demo" | "seed";

export const TRIGGER_LABEL: Record<ScanTrigger, string> = {
  manual: "Manual",
  scheduled: "Scheduled",
  onboarding: "Onboarding",
  demo: "Demo",
  seed: "Historical",
};

export const SCAN_STATUS_META: Record<
  ScanStatus,
  { label: string; variant: "success" | "default" | "secondary" | "danger" | "outline" }
> = {
  completed: { label: "Completed", variant: "success" },
  running: { label: "Running", variant: "default" },
  queued: { label: "Queued", variant: "secondary" },
  failed: { label: "Failed", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export const TRUST_NOTE = "AI answers can vary between runs. Scores are based on the queries and providers monitored by your account.";
export const METRIC_NOTE = "The AI Visibility score is a proprietary monitoring metric, not a search-engine ranking.";

/** "4 min 12 s", "38 s", "1 h 5 min" — or null when either end is missing. */
export function formatDuration(start: Date | string | null | undefined, end: Date | string | null | undefined): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds ? `${minutes} min ${seconds} s` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Points difference rounded to one decimal, or null when either side is missing. */
export function scoreDiff(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null) return null;
  return Math.round((current - previous) * 10) / 10;
}
