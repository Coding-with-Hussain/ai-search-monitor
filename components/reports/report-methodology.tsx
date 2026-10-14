import { formatDateTime } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { SCORE_WEIGHTS } from "@/services/scoring";
import type { ReportSnapshot } from "@/types/report";

import { formatPeriod, REPORT_METRIC_NOTE, REPORT_TRUST_NOTE } from "./labels";

/** How the report was produced, and what it does and does not claim. */
export function ReportMethodology({ snapshot, reportId }: { snapshot: ReportSnapshot; reportId: string }) {
  const name = snapshot.business.name;
  const scoringVersion = snapshot.metrics.scoringVersion;
  return (
    <footer className="print-avoid-break rounded-xl border border-border bg-surface-muted/60 p-5 sm:p-6">
      <h3 className="text-[15px] font-semibold tracking-tight">Methodology</h3>
      <div className="mt-3 grid gap-4 text-[13px] leading-relaxed text-muted-foreground md:grid-cols-2 md:gap-6">
        <div className="space-y-2.5">
          <p>
            Each monitored question is asked to each monitored AI platform. Every answer is analyzed for whether {name} is
            mentioned and recommended, where it appears in the recommendation list, the tone of the mention and whether its
            website is cited as a source. The same signals are measured for tracked competitors.
          </p>
          <p>
            The AI Visibility score (0–100) is the average over all analyzed answers of: mentioned ({SCORE_WEIGHTS.mentioned}{" "}
            points), recommended ({SCORE_WEIGHTS.recommended}), position in the list (up to {SCORE_WEIGHTS.position}), own
            website cited ({SCORE_WEIGHTS.citation}) and positive tone (up to {SCORE_WEIGHTS.sentiment}).
          </p>
        </div>
        <div className="space-y-2.5">
          <p>
            {REPORT_TRUST_NOTE} {REPORT_METRIC_NOTE}
          </p>
          <p>
            This report is a point-in-time snapshot of the monitoring period {formatPeriod(snapshot.period.start, snapshot.period.end)}.
            Recommended actions are based on observed signals in monitored AI answers; they do not guarantee that AI assistants
            will recommend {name}.
          </p>
          {snapshot.isSimulation && (
            <p className="font-medium text-warning-text">
              Simulated data: these results come from simulated AI answers, not from real AI assistants.
            </p>
          )}
        </div>
      </div>
      <p className="mt-5 border-t border-border pt-4 text-xs text-subtle-foreground">
        {snapshot.whiteLabel ? `Prepared by ${snapshot.whiteLabel.brandName}` : `Generated with ${siteConfig.name}`} ·{" "}
        {formatDateTime(snapshot.generatedAt)}
        {scoringVersion ? ` · Scoring model ${scoringVersion}` : ""} · Report {reportId.slice(0, 8)}
      </p>
    </footer>
  );
}
