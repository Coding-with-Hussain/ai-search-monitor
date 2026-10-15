import { FlaskConical } from "lucide-react";
import type * as React from "react";

import { SimulationBadge } from "@/components/app/simulation-badge";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { extractDomain } from "@/lib/domain";
import { formatDateTime, pluralize } from "@/lib/format";
import { coverageSentence } from "@/services/scans/coverage";
import type { ReportSnapshot } from "@/types/report";

import { formatPeriod } from "./labels";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{children}</dd>
    </div>
  );
}

/**
 * Report title block: brand (or the white-label "Prepared by" name), the
 * business, the monitoring period and, for simulated data, a clear label.
 */
export function ReportCover({
  snapshot,
  headingId,
  isDemo,
}: {
  snapshot: ReportSnapshot;
  headingId: string;
  isDemo: boolean;
}) {
  const { business, whiteLabel } = snapshot;
  const scans = snapshot.history.length;
  const website = business.website ? (extractDomain(business.website) ?? business.website) : null;

  return (
    <header className="print-avoid-break rounded-xl border border-border bg-surface p-5 shadow-card sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {whiteLabel ? (
          <div>
            <p className="text-[11px] font-medium tracking-wide text-subtle-foreground uppercase">Prepared by</p>
            <p className="mt-0.5 text-base font-semibold tracking-tight">{whiteLabel.brandName}</p>
          </div>
        ) : (
          <Logo />
        )}
        <div className="text-left text-xs text-muted-foreground sm:text-right">
          <p className="font-medium text-foreground">AI Visibility Report</p>
          <p className="mt-0.5">Generated {formatDateTime(snapshot.generatedAt)}</p>
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
        <h2 id={headingId} className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {business.name}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          How often monitored AI answers mention and recommend {business.name}, compared with tracked competitors.
        </p>
        {(snapshot.isSimulation || isDemo) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {snapshot.isSimulation && <SimulationBadge label="Simulated data" />}
            {isDemo && <Badge variant="demo">Demo data</Badge>}
          </div>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-4">
        <Fact label="Website">{website ?? "—"}</Fact>
        <Fact label="Industry">{business.industry || "—"}</Fact>
        <Fact label="Location">{business.location ?? "—"}</Fact>
        <Fact label="Monitoring period">
          {formatPeriod(snapshot.period.start, snapshot.period.end)}
          <span className="block text-xs font-normal text-muted-foreground">{pluralize(scans, "completed scan")}</span>
        </Fact>
      </dl>

      {snapshot.isSimulation && (
        <p className="mt-5 flex items-start gap-2 rounded-lg border border-dashed border-warning/60 bg-warning-soft px-3 py-2.5 text-[13px] leading-relaxed text-warning-text">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            This report is based on simulated AI answers: no real AI assistant was queried. The analysis and scoring are
            real, but the results do not describe how AI assistants currently see this business.
          </span>
        </p>
      )}
      {snapshot.metrics.coverage && (
        <p className="mt-3 rounded-lg border border-warning/60 bg-warning-soft px-3 py-2.5 text-[13px] leading-relaxed text-warning-text">
          Partial scan: {coverageSentence(snapshot.metrics.coverage)}. Results describe the questions that were checked
          and are not compared with the previous scan.
        </p>
      )}
    </header>
  );
}
