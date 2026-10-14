import type { ReportSnapshot } from "@/types/report";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Structural check of a stored report snapshot before rendering it, so a
 * damaged or unknown-version row shows a clear message instead of crashing.
 */
export function isReportSnapshot(value: unknown): value is ReportSnapshot {
  if (!isRecord(value) || value.version !== 1) return false;
  const { business, period, metrics } = value;
  if (!isRecord(business) || typeof business.name !== "string") return false;
  if (!isRecord(period) || typeof period.end !== "string") return false;
  if (!isRecord(metrics) || !isRecord(metrics.overall)) return false;
  if (typeof metrics.overall.score !== "number") return false;
  if (!Array.isArray(metrics.providers) || !Array.isArray(metrics.competitors)) return false;
  if (!Array.isArray(metrics.shareOfVoice) || !Array.isArray(metrics.queries)) return false;
  return (
    typeof value.generatedAt === "string" &&
    typeof value.scanId === "string" &&
    Array.isArray(value.history) &&
    Array.isArray(value.wins) &&
    Array.isArray(value.problems) &&
    Array.isArray(value.recommendations)
  );
}
