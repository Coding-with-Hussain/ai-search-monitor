import { providerName } from "@/lib/providers-meta";
import { CATEGORY_LABELS } from "@/services/metrics/aggregate";
import { type MonitoringFrequency, type Priority, PROVIDER_IDS, type ProviderId, QUERY_CATEGORIES } from "@/types/domain";

import type { ProviderResult, ResultState } from "./types";

/** Client-safe labels and helpers shared by the Questions area. */

export { CATEGORY_LABELS };

export const CATEGORY_OPTIONS = QUERY_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }));

export const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };

export const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const GENERATE_COUNTS = [5, 10, 20] as const;
export type GenerateCount = (typeof GENERATE_COUNTS)[number];

export const STATUS_FILTER_LABEL = {
  active: "Active",
  paused: "Paused",
  mentioned: "Mentioned",
  not_mentioned: "Not mentioned",
  recommended: "Recommended",
} as const;

export type StatusFilter = keyof typeof STATUS_FILTER_LABEL;

export const VISIBILITY_STATUSES: StatusFilter[] = ["recommended", "mentioned", "not_mentioned"];

export const FREQUENCY_LABEL: Record<MonitoringFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  manual: "Manual only",
};

/** Approximate automatic scans per month, for usage estimates. */
export const SCANS_PER_MONTH: Record<MonitoringFrequency, number> = { daily: 30, weekly: 4, monthly: 1, manual: 0 };

export function sortProviders(ids: Iterable<string>): ProviderId[] {
  const set = new Set(ids);
  return PROVIDER_IDS.filter((p) => set.has(p));
}

/** Text + dot style for one (question × platform) result. Text always carries the meaning. */
export function resultLabel(result: ProviderResult | undefined): { label: string; dot: string } {
  if (!result) return { label: "—", dot: "border border-dashed border-border-strong" };
  const state: ResultState = result.state;
  switch (state) {
    case "recommended":
      return { label: result.position ? `Recommended #${result.position}` : "Recommended", dot: "bg-success" };
    case "mentioned":
      return { label: "Mentioned", dot: "bg-warning" };
    case "not_mentioned":
      return { label: "Not mentioned", dot: "border border-border-strong bg-surface" };
    case "failed":
      return { label: "Check failed", dot: "bg-danger" };
    case "unavailable":
      return { label: "Unavailable", dot: "border border-dashed border-border-strong" };
    case "pending":
      return { label: "In progress", dot: "border border-primary bg-primary-soft" };
    default:
      return { label: "Not analyzed", dot: "border border-dashed border-border-strong" };
  }
}

export function resultAccessibleLabel(provider: ProviderId, result: ProviderResult | undefined) {
  const { label } = resultLabel(result);
  return `${providerName(provider)}: ${label === "—" ? "not in the latest scan" : label}`;
}
