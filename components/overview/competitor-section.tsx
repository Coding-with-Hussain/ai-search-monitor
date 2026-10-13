import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { type ComparisonEntity, CompetitorBars, CompetitorTable } from "@/components/dashboard/competitor-comparison";
import { ShareOfVoice } from "@/components/dashboard/share-of-voice";
import { Button } from "@/components/ui/button";
import { formatPercent, formatPosition } from "@/lib/format";
import { cn } from "@/lib/utils";
import { strongestCompetitor } from "@/services/metrics/competitor-insights";

import { overviewLinks } from "./helpers";
import { SectionCard } from "./section-card";
import { TOUR_TARGETS, type ProjectOverviewData } from "./types";

function comparisonSentence(data: ProjectOverviewData): string | null {
  const strongest = strongestCompetitor(data.metrics);
  if (!strongest) return null;
  const points = Math.round(strongest.metrics.score - data.metrics.overall.score);
  if (points > 0) return `${strongest.name} is ${points} ${points === 1 ? "point" : "points"} ahead.`;
  if (points < 0) return `You are ${-points} ${points === -1 ? "point" : "points"} ahead of ${strongest.name}.`;
  return `You and ${strongest.name} have the same score.`;
}

/** Competitor comparison: score bars, full metrics table (cards on mobile). */
export function CompetitorSection({ data }: { data: ProjectOverviewData }) {
  const links = overviewLinks(data);
  const entities: ComparisonEntity[] = [
    { key: "business", name: data.businessName, isYou: true, metrics: data.metrics.overall },
    ...data.metrics.competitors.map((c) => ({ key: c.competitorId, name: c.name, isYou: false, metrics: c.metrics })),
  ];
  const sentence = comparisonSentence(data);

  return (
    <SectionCard
      tour={TOUR_TARGETS.competitors}
      className="lg:col-span-2"
      title="Competitor comparison"
      description="AI Visibility score for you and each tracked competitor, from the same monitored answers."
      actions={
        links.competitors && data.metrics.competitors.length > 0 ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={links.competitors}>
              Competitor analysis
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : undefined
      }
    >
      {data.metrics.competitors.length === 0 ? (
        <EmptyState
          icon={Users}
          className="py-8"
          title={data.competitorOrder.length > 0 ? "Competitors were added after this scan" : "No competitors tracked yet"}
          description={
            data.competitorOrder.length > 0
              ? "Run a new scan to compare your AI visibility with them."
              : "Add the businesses you compete with to see who AI assistants recommend instead of you."
          }
          action={
            links.competitors && data.competitorOrder.length === 0 ? (
              <Button asChild size="sm">
                <Link href={links.competitors}>Add competitors</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {sentence && <p className="text-sm font-medium">{sentence}</p>}
          <CompetitorBars entities={entities} />
          <div className="hidden border-t border-border pt-4 md:block">
            <CompetitorTable entities={entities} />
          </div>
          <CompactCompetitorList entities={entities} />
        </div>
      )}
    </SectionCard>
  );
}

/** Mobile alternative to the wide table: one small card per business. */
function CompactCompetitorList({ entities }: { entities: ComparisonEntity[] }) {
  const sorted = [...entities].sort((a, b) => b.metrics.score - a.metrics.score);
  return (
    <ul className="space-y-2 border-t border-border pt-4 md:hidden" aria-label="Competitor metrics">
      {sorted.map((e) => (
        <li key={e.key} className={cn("rounded-lg border border-border p-3", e.isYou && "bg-primary-soft/50")}>
          <div className="flex items-center justify-between gap-3">
            <p className={cn("truncate text-sm", e.isYou && "font-semibold")}>
              {e.name}
              {e.isYou && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
            </p>
            <p className="shrink-0 text-sm font-semibold tabular">
              {Math.round(e.metrics.score)}
              <span className="text-xs font-normal text-muted-foreground">/100</span>
            </p>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-subtle-foreground">Share of voice</dt>
              <dd className="tabular">{formatPercent(e.metrics.shareOfVoice)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-subtle-foreground">Recommended</dt>
              <dd className="tabular">{formatPercent(e.metrics.recommendationRate)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-subtle-foreground">Mentioned</dt>
              <dd className="tabular">{formatPercent(e.metrics.mentionRate)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-subtle-foreground">Avg. position</dt>
              <dd className="tabular">{formatPosition(e.metrics.averagePosition)}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

/** Part-to-whole of recommendations across all businesses. */
export function ShareOfVoiceSection({ data }: { data: ProjectOverviewData }) {
  return (
    <SectionCard
      title="Share of voice"
      description="Percentage of monitored AI recommendations mentioning each business."
    >
      <ShareOfVoice slices={data.metrics.shareOfVoice} competitorOrder={data.competitorOrder} />
      <p className="mt-4 text-xs text-subtle-foreground">
        “Others” are businesses AI assistants recommended that you don&apos;t track as competitors.
      </p>
    </SectionCard>
  );
}
