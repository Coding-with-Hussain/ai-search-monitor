import Link from "next/link";

import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  RECOMMENDATION_STATUS_VALUES,
  type RecommendationFilterValues,
  type RecommendationStatusValue,
  recommendationsHref,
  STATUS_LABEL,
} from "./labels";

/** Open / Completed / Dismissed tabs with counts. Links keep the other filters. */
export function StatusTabs({
  basePath,
  filters,
  counts,
}: {
  basePath: string;
  filters: RecommendationFilterValues;
  counts: Record<RecommendationStatusValue, number>;
}) {
  return (
    <nav aria-label="Recommendation status">
      <ul className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface-muted p-1 sm:inline-grid sm:w-auto">
        {RECOMMENDATION_STATUS_VALUES.map((status) => {
          const active = filters.status === status;
          return (
            <li key={status} className="min-w-0">
              <Link
                href={recommendationsHref(basePath, { ...filters, status })}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center justify-center gap-1 rounded-md px-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:gap-1.5 sm:px-3",
                  active && "bg-surface text-foreground shadow-sm",
                )}
              >
                <span className="truncate">{STATUS_LABEL[status]}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] leading-[18px] tabular",
                    active ? "bg-primary-soft text-primary-soft-foreground" : "bg-surface-sunken text-muted-foreground",
                  )}
                >
                  {formatNumber(counts[status])}
                  <span className="sr-only"> {counts[status] === 1 ? "recommendation" : "recommendations"}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
