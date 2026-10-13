import { ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { overviewLinks, PRIORITY_BADGE, PRIORITY_LABEL } from "./helpers";
import { RetryButton } from "./retry-button";
import { SectionCard } from "./section-card";
import { TOUR_TARGETS, type ProjectOverviewData } from "./types";

/** Top open recommendations, highest priority first. */
export function RecommendationsPreview({ data }: { data: ProjectOverviewData }) {
  const links = overviewLinks(data);
  const items = data.recommendations;
  const more = items ? Math.max(0, data.recommendationCount - items.length) : 0;

  return (
    <SectionCard
      tour={TOUR_TARGETS.recommendations}
      title="Recommended next steps"
      description="Practical actions based on observed signals in your monitored answers."
    >
      {items === null ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-3 py-4 text-[13px] text-muted-foreground">
          <p>We couldn&apos;t load your recommendations right now.</p>
          <RetryButton />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
          <Lightbulb className="size-5 text-subtle-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">No open recommendations</p>
          <p className="text-[13px] text-muted-foreground">Run an AI scan to discover opportunities.</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-lg border border-border p-3.5">
              <Badge variant={PRIORITY_BADGE[r.priority]}>{PRIORITY_LABEL[r.priority]}</Badge>
              <p className="mt-2 text-sm leading-snug font-medium text-pretty">{r.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{r.reason}</p>
            </li>
          ))}
        </ol>
      )}

      {items !== null && (
        <div className="mt-4">
          {links.recommendations ? (
            <Button asChild variant="secondary" size="sm" className="w-full">
              <Link href={links.recommendations}>
                {more > 0 ? `View all ${data.recommendationCount} recommendations` : "Open recommendations"}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" size="sm" className="w-full">
              <Link href={links.signup}>
                Start Monitoring to get yours
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </SectionCard>
  );
}
