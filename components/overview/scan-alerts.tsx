import { Alert } from "@/components/ui/alert";
import { formatDate, formatDateTime } from "@/lib/format";
import { PROVIDER_META } from "@/lib/providers-meta";
import type { ProviderId, ScanMetrics } from "@/types/domain";

import type { ProviderUnavailableReason } from "./types";

export interface LatestAttempt {
  status: "queued" | "running" | "failed" | "cancelled";
  error: string | null;
  createdAt: string;
}

const FAILED_PREFIX = /^your scan failed:\s*/i;

/** "no provider configured" → "No provider configured." */
function sentence(text: string) {
  const t = text.trim();
  if (!t) return "";
  const capitalized = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

/**
 * Alerts about the most recent scan attempt when it is newer than the results
 * shown (running, failed or cancelled). Retrying uses the Run scan button in
 * the project header above.
 */
export function ScanAttemptAlert({ attempt, lastCompletedAt }: { attempt: LatestAttempt | null; lastCompletedAt: string | null }) {
  if (!attempt) return null;
  const showing = lastCompletedAt ? ` Showing results from your last completed scan (${formatDate(lastCompletedAt)}).` : "";

  if (attempt.status === "queued" || attempt.status === "running") {
    return (
      <Alert variant="info" title="A scan is in progress">
        Results on this page will update when it completes. You can leave this page; the scan keeps running.
      </Alert>
    );
  }
  if (attempt.status === "failed") {
    const reason = sentence(attempt.error?.replace(FAILED_PREFIX, "") ?? "");
    return (
      <Alert variant="danger" title="Your scan failed">
        {reason ? `${reason} ` : ""}
        The attempt on {formatDateTime(attempt.createdAt)} did not produce results. Use the Run scan button above to try
        again.{showing}
      </Alert>
    );
  }
  return (
    <Alert variant="neutral" title="Your latest scan was cancelled">
      The scan started on {formatDateTime(attempt.createdAt)} was cancelled before it finished.{showing}
    </Alert>
  );
}

function listNames(ids: ProviderId[]) {
  const names = ids.map((id) => PROVIDER_META[id]?.name ?? id);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Warning for a completed scan where some answers or platforms were missing. */
export function PartialScanAlert({
  metrics,
  reasons,
}: {
  metrics: ScanMetrics;
  reasons: Partial<Record<ProviderId, ProviderUnavailableReason>>;
}) {
  const unavailable = metrics.unavailableProviders;
  if (metrics.runsFailed <= 0 && unavailable.length === 0) return null;

  const notConfigured = unavailable.filter((p) => reasons[p] === "not_configured");
  const noResults = unavailable.filter((p) => reasons[p] !== "not_configured");
  const unavailableFailures = metrics.providers
    .filter((p) => p.status === "unavailable")
    .reduce((sum, p) => sum + p.failedRuns, 0);
  const otherFailures = Math.max(0, metrics.runsFailed - unavailableFailures);

  return (
    <Alert variant="warning" title="Some AI answers could not be collected">
      <ul className="list-disc space-y-0.5 pl-4">
        {notConfigured.length > 0 && (
          <li>
            {listNames(notConfigured)} {notConfigured.length === 1 ? "was" : "were"} unavailable: API configuration is
            missing.
          </li>
        )}
        {noResults.length > 0 && (
          <li>
            {listNames(noResults)} {noResults.length === 1 ? "was" : "were"} unavailable and returned no results in this
            scan.
          </li>
        )}
        {otherFailures > 0 && (
          <li>
            {otherFailures} of {metrics.runsTotal} AI answers could not be retrieved.
          </li>
        )}
      </ul>
      <p className="mt-1">Scores are based on the {metrics.runsSucceeded} answers that were collected.</p>
    </Alert>
  );
}
