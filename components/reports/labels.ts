import { PRIORITIES, type Priority } from "@/types/domain";

/** Client-safe labels and formatting for the Reports area. */

const mediumDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Oct 7, 2026". */
export function formatMediumDate(value: string | Date | null | undefined) {
  const d = toDate(value);
  return d ? mediumDate.format(d) : "—";
}

/**
 * Monitoring period as text: "Sep 9 – Oct 7, 2026", "Dec 2, 2025 – Jan 6, 2026"
 * or a single date when the period is one day.
 */
export function formatPeriod(start: string | Date | null | undefined, end: string | Date | null | undefined) {
  const e = toDate(end);
  const s = toDate(start);
  if (!e) return "—";
  if (!s || s.toISOString().slice(0, 10) === e.toISOString().slice(0, 10)) return mediumDate.format(e);
  return s.getUTCFullYear() === e.getUTCFullYear()
    ? `${monthDay.format(s)} – ${mediumDate.format(e)}`
    : `${mediumDate.format(s)} – ${mediumDate.format(e)}`;
}

/** Report snapshots store priority as a string; unknown values read as medium. */
export function toPriority(value: string): Priority {
  return (PRIORITIES as readonly string[]).includes(value) ? (value as Priority) : "medium";
}

export const REPORT_TRUST_NOTE =
  "AI answers can vary between runs. Scores are based on the queries and providers monitored by your account.";
export const REPORT_METRIC_NOTE = "The AI Visibility score is a proprietary monitoring metric, not a search-engine ranking.";
