import type { ScanCoverage, ScanMetrics } from "@/types/domain";

/** Coverage of a scan that checked only some active questions; undefined for a full scan. */
export function scanCoverage(scan: {
  queryCount: number;
  config: { activeQuestions?: number; limitedBy?: "quota" | "cap" };
}): ScanCoverage | undefined {
  const active = scan.config.activeQuestions;
  if (!active || active <= scan.queryCount) return undefined;
  return { checked: scan.queryCount, active, reason: scan.config.limitedBy ?? "quota" };
}

/** Two scans can be compared only when both checked the full question set. */
export function comparableScans(
  a: Pick<ScanMetrics, "coverage"> | null | undefined,
  b: Pick<ScanMetrics, "coverage"> | null | undefined,
): boolean {
  return !a?.coverage && !b?.coverage;
}

/** "10 of 20 questions checked (monthly query limit reached)". */
export function coverageSentence(coverage: ScanCoverage): string {
  const why = coverage.reason === "quota" ? "monthly query limit reached" : "per-scan safety limit";
  return `${coverage.checked} of ${coverage.active} active questions checked (${why})`;
}
