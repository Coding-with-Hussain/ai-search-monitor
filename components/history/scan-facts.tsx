import type * as React from "react";

import { Card } from "@/components/ui/card";
import { formatDateTime, formatNumber } from "@/lib/format";
import { providerName } from "@/lib/providers-meta";
import type { Scan } from "@/db/schema";

import { formatDuration, TRIGGER_LABEL } from "./labels";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{children}</dd>
    </div>
  );
}

/** Key facts about one scan: timing, mode, trigger and collection counts. */
export function ScanFacts({ scan }: { scan: Pick<Scan, "createdAt" | "startedAt" | "completedAt" | "mode" | "trigger" | "providers" | "queryCount" | "totalItems" | "completedItems" | "failedItems"> & { scoringVersion?: string | null } }) {
  const duration = formatDuration(scan.startedAt ?? scan.createdAt, scan.completedAt);
  const providers = scan.providers.map(providerName).join(", ");
  return (
    <Card className="p-5">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        <Fact label="Started">{formatDateTime(scan.startedAt ?? scan.createdAt)}</Fact>
        <Fact label="Finished">{scan.completedAt ? formatDateTime(scan.completedAt) : "Not finished"}</Fact>
        <Fact label="Duration">{duration ?? "—"}</Fact>
        <Fact label="Mode">{scan.mode === "mock" ? "Simulation (no real AI calls)" : "Live AI answers"}</Fact>
        <Fact label="Trigger">{TRIGGER_LABEL[scan.trigger]}</Fact>
        <Fact label="Questions checked">{formatNumber(scan.queryCount)}</Fact>
        <Fact label="AI platforms">{providers || "—"}</Fact>
        <Fact label="Answers collected">
          <span className="tabular">
            {formatNumber(scan.completedItems)} of {formatNumber(scan.totalItems)}
          </span>
        </Fact>
        <Fact label="Failed checks">
          <span className={scan.failedItems > 0 ? "text-warning-text tabular" : "tabular"}>{formatNumber(scan.failedItems)}</span>
        </Fact>
        {scan.scoringVersion && <Fact label="Scoring model">{scan.scoringVersion}</Fact>}
      </dl>
    </Card>
  );
}
