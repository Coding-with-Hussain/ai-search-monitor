import { CompetitorSection, ShareOfVoiceSection } from "./competitor-section";
import { MetricGrid } from "./metric-grid";
import { PlatformCards } from "./platform-cards";
import { RecommendationsPreview } from "./recommendations-preview";
import { PartialScanAlert } from "./scan-alerts";
import { ScoreHero } from "./score-hero";
import { TopQuestions } from "./top-questions";
import { TopSources } from "./top-sources";
import type { ProjectOverviewData } from "./types";
import { VisibilitySection } from "./visibility-section";

/**
 * The project dashboard body, shared by /projects/[id] and the public /demo.
 * Purely presentational: every value comes from `data` (plain JSON), so the
 * same component renders real monitoring results and the in-memory demo.
 *
 * Sections run top to bottom in the same order as the product tour: score,
 * platforms, competitors, recommendations, history.
 */
export function ProjectOverview({ data }: { data: ProjectOverviewData }) {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <PartialScanAlert metrics={data.metrics} reasons={data.unavailableReasons} />
      <ScoreHero data={data} />
      <MetricGrid data={data} />
      <PlatformCards data={data} />
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 lg:items-start">
        <CompetitorSection data={data} />
        <RecommendationsPreview data={data} />
      </div>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <VisibilitySection data={data} />
        <ShareOfVoiceSection data={data} />
      </div>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <TopQuestions data={data} />
        <TopSources data={data} />
      </div>
    </div>
  );
}
