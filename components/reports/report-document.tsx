import { CompetitorBars, CompetitorTable } from "@/components/dashboard/competitor-comparison";
import { ShareOfVoice } from "@/components/dashboard/share-of-voice";
import { comparisonEntities } from "@/components/history/comparison";
import { InsightsList } from "@/components/history/insights-list";
import { MetricTiles } from "@/components/history/metric-tiles";
import { Panel } from "@/components/history/panel";
import { PlatformScores } from "@/components/history/platform-scores";
import { ScoreSummary } from "@/components/history/score-summary";
import type { ReportSnapshot } from "@/types/report";

import { ReportActionsList } from "./report-actions-list";
import { ReportCover } from "./report-cover";
import { ReportHistory } from "./report-history";
import { ReportMethodology } from "./report-methodology";

/**
 * The printable report, rendered entirely from its stored snapshot so it
 * always shows what was true when it was generated. In print, colors are kept
 * (bars and legend swatches carry data) and help buttons are hidden.
 */
export function ReportDocument({
  reportId,
  snapshot,
  isDemo,
}: {
  reportId: string;
  snapshot: ReportSnapshot;
  isDemo: boolean;
}) {
  const { metrics } = snapshot;
  const headingId = `report-${reportId}-title`;
  const entities = comparisonEntities(metrics, snapshot.business.name);
  const competitorOrder = metrics.competitors.map((c) => c.competitorId);

  return (
    <article
      aria-labelledby={headingId}
      className="report-root flex flex-col gap-4 [-webkit-print-color-adjust:exact] [print-color-adjust:exact] sm:gap-6 print:block print:space-y-5 print:[&_button]:hidden"
    >
      <ReportCover snapshot={snapshot} headingId={headingId} isDemo={isDemo} />

      <Panel title="AI visibility summary" description="Results of the latest completed scan in the period.">
        <ScoreSummary metrics={metrics} previousScore={snapshot.previousScore} />
        <MetricTiles className="mt-6" overall={metrics.overall} />
      </Panel>

      <Panel title="Top wins and problems" description="Observed signals from the monitored AI answers.">
        <InsightsList wins={snapshot.wins} problems={snapshot.problems} />
      </Panel>

      <Panel title="AI platform scores" description="AI Visibility on each monitored AI platform.">
        <PlatformScores providers={metrics.providers} />
      </Panel>

      <Panel
        title="Competitor comparison"
        description="AI Visibility of the business and its tracked competitors in the same monitored answers."
      >
        {metrics.competitors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No competitors were tracked in this scan.</p>
        ) : (
          <div className="flex flex-col gap-5">
            <CompetitorBars entities={entities} />
            <CompetitorTable entities={entities} />
          </div>
        )}
      </Panel>

      <Panel title="Share of voice" description="Who AI assistants recommended across monitored answers.">
        <ShareOfVoice
          slices={metrics.shareOfVoice}
          competitorOrder={competitorOrder}
          businessLabel={snapshot.business.name}
        />
      </Panel>

      <Panel
        avoidBreak={false}
        title="Recommended actions"
        description="Highest-value open recommendations when the report was generated, based on observed signals."
      >
        <ReportActionsList items={snapshot.recommendations} />
      </Panel>

      <Panel avoidBreak={false} title="Historical changes" description="AI Visibility score of each completed scan in the period.">
        <ReportHistory history={snapshot.history} />
      </Panel>

      <ReportMethodology snapshot={snapshot} reportId={reportId} />
    </article>
  );
}
