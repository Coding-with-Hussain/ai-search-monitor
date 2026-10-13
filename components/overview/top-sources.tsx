import { Badge } from "@/components/ui/badge";
import { formatPercent, pluralize } from "@/lib/format";

import { SectionCard } from "./section-card";
import type { ProjectOverviewData } from "./types";

const LIMIT = 6;

/** Domains most often cited as sources in monitored answers (single series). */
export function TopSources({ data }: { data: ProjectOverviewData }) {
  const sources = data.metrics.topSources.slice(0, LIMIT);
  return (
    <SectionCard
      title="Frequently cited sources in your monitored responses"
      description="Share of monitored AI answers that cited each website."
    >
      {sources.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[13px] text-muted-foreground">
          No sources were cited in the monitored answers of this scan.
        </p>
      ) : (
        <ul className="space-y-3.5" aria-label="Cited sources">
          {sources.map((s) => (
            <li key={s.domain}>
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium" title={s.domain}>
                    {s.domain}
                  </span>
                  {s.isOwnDomain && <Badge variant="default">Your website</Badge>}
                  {!s.isOwnDomain && s.competitorName && (
                    <Badge variant="secondary" className="max-w-32 truncate">
                      {s.competitorName}
                    </Badge>
                  )}
                </span>
                <span className="shrink-0 font-semibold tabular">{formatPercent(s.share)}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-muted" aria-hidden="true">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(1.5, Math.min(100, s.share))}%`, background: "var(--series-1)" }}
                />
              </div>
              <p className="mt-1 text-xs text-subtle-foreground">Cited in {pluralize(s.count, "answer")}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-subtle-foreground">
        Shows which websites AI assistants referenced, not why a business was recommended.
      </p>
    </SectionCard>
  );
}
