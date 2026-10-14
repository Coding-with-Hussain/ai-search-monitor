import { PRIORITY_BADGE, PRIORITY_LABEL } from "@/components/recommendations/labels";
import { Badge } from "@/components/ui/badge";
import type { ReportSnapshot } from "@/types/report";

import { toPriority } from "./labels";

/** Recommended next steps stored with the report (open recommendations at generation time). */
export function ReportActionsList({ items }: { items: ReportSnapshot["recommendations"] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        There were no open recommendations when this report was generated. New opportunities appear after each scan as
        new signals are observed.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3 print:block print:space-y-3">
      {items.map((item, i) => {
        const priority = toPriority(item.priority);
        return (
          <li key={`${i}-${item.title}`} className="print-avoid-break flex gap-3 rounded-lg border border-border p-4 sm:gap-4">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[13px] font-semibold text-muted-foreground tabular"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={PRIORITY_BADGE[priority]} className="text-[11px] font-semibold tracking-wide uppercase">
                  {PRIORITY_LABEL[priority]}
                </Badge>
              </div>
              <h4 className="mt-2 text-[15px] leading-snug font-semibold tracking-tight text-pretty">{item.title}</h4>
              <p className="mt-2 text-sm leading-relaxed font-medium text-foreground">
                <span className="text-xs font-semibold tracking-wide text-primary-soft-foreground uppercase">Action: </span>
                {item.action}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Why: </span>
                {item.reason}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
