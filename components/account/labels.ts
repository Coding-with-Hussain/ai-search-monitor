import type { Project } from "@/db/schema";

export const FREQUENCY_LABEL: Record<Project["monitoringFrequency"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  manual: "Manual only",
};

/** "Weekly", "Manual only" or "Paused". */
export function monitoringLabel(project: Pick<Project, "monitoringEnabled" | "monitoringFrequency">) {
  if (project.monitoringFrequency === "manual") return FREQUENCY_LABEL.manual;
  return project.monitoringEnabled ? FREQUENCY_LABEL[project.monitoringFrequency] : "Paused";
}

export function projectLocation(project: Pick<Project, "city" | "country">) {
  return [project.city, project.country].filter(Boolean).join(", ");
}

export const SCORE_DISCLAIMER =
  "AI answers can vary between runs. Scores are based on the queries and providers monitored by your account.";

export const SCORE_DEFINITION =
  "The AI Visibility score (0–100) is a proprietary monitoring metric, not a search-engine ranking. It combines how often monitored AI answers mention and recommend you, your position in those answers, sentiment and citations.";

/** Server-render helpers (pages render once per request, so "now" is stable). */
export function isPast(date: Date) {
  return date.getTime() <= Date.now();
}

/** Whole days until `date`, never negative. */
export function daysUntil(date: Date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}
