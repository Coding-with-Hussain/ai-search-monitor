import { CircleCheck, CircleSlash, ListChecks } from "lucide-react";
import { useId } from "react";
import type * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Priority, RecommendationCategory } from "@/types/domain";

import { RecommendationActions } from "./recommendation-actions";
import {
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  IMPACT_LABEL,
  PRIORITY_BADGE,
  PRIORITY_LABEL,
  type RecommendationStatusValue,
} from "./labels";

export interface RecommendationCardData {
  id: string;
  title: string;
  description: string;
  reason: string;
  evidence: string | null;
  action: string;
  category: RecommendationCategory;
  priority: Priority;
  impact: "low" | "medium" | "high";
  difficulty: "easy" | "medium" | "hard";
  status: RecommendationStatusValue;
  /** ISO timestamps. */
  updatedAt: string;
  completedAt: string | null;
  dismissedAt: string | null;
}

const LEVEL_STEPS = { low: 1, medium: 2, high: 3 } as const;

/** Three-step meter; the text label next to it carries the meaning. */
function LevelMeter({ level }: { level: keyof typeof LEVEL_STEPS }) {
  const filled = LEVEL_STEPS[level];
  return (
    <span className="inline-flex items-end gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className={cn("w-1 rounded-[1px]", step <= filled ? "bg-primary" : "bg-surface-sunken")}
          style={{ height: 4 + step * 3 }}
        />
      ))}
    </span>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1.5 font-medium text-foreground">{children}</dd>
    </div>
  );
}

/**
 * One recommendation: priority, title, why it matters, the observed reason and
 * evidence, the suggested action (emphasized), impact, difficulty and status.
 */
export function RecommendationCard({ projectId, recommendation: r }: { projectId: string; recommendation: RecommendationCardData }) {
  const titleId = useId();
  const statusDate = r.status === "completed" ? r.completedAt : r.status === "dismissed" ? r.dismissedAt : null;

  return (
    <Card className={cn("flex min-w-0 flex-col", r.status !== "open" && "bg-surface-muted/40 shadow-none")}>
      <article aria-labelledby={titleId} className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={PRIORITY_BADGE[r.priority]} className="text-[11px] font-semibold tracking-wide uppercase">
            {PRIORITY_LABEL[r.priority]}
          </Badge>
          <Badge variant="outline">{CATEGORY_LABEL[r.category]}</Badge>
          {r.status === "completed" && (
            <Badge variant="success">
              <CircleCheck aria-hidden="true" />
              Completed
            </Badge>
          )}
          {r.status === "dismissed" && (
            <Badge variant="secondary">
              <CircleSlash aria-hidden="true" />
              Dismissed
            </Badge>
          )}
        </div>

        <h3 id={titleId} className="mt-3 text-base leading-snug font-semibold tracking-tight text-pretty sm:text-[17px]">
          {r.title}
        </h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2 md:gap-6">
          <section>
            <h4 className="text-xs font-medium tracking-wide text-subtle-foreground uppercase">Why this matters</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.description}</p>
          </section>
          <section>
            <h4 className="text-xs font-medium tracking-wide text-subtle-foreground uppercase">Reason and evidence</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground">{r.reason}</p>
            {r.evidence && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.evidence}</p>}
          </section>
        </div>

        <section className="mt-4 rounded-lg border border-primary/20 bg-primary-soft p-4">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary-soft-foreground uppercase">
            <ListChecks className="size-3.5" aria-hidden="true" />
            Suggested action
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed font-medium text-foreground">{r.action}</p>
        </section>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          <Detail label="Expected impact">
            <LevelMeter level={r.impact} />
            {IMPACT_LABEL[r.impact]}
          </Detail>
          <Detail label="Difficulty">{DIFFICULTY_LABEL[r.difficulty]}</Detail>
          <Detail label="Category">{CATEGORY_LABEL[r.category]}</Detail>
          <Detail label={r.status === "completed" ? "Completed" : r.status === "dismissed" ? "Dismissed" : "Last updated"}>
            <time dateTime={statusDate ?? r.updatedAt}>{formatDate(statusDate ?? r.updatedAt)}</time>
          </Detail>
        </dl>
      </article>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3 sm:px-6">
        <RecommendationActions projectId={projectId} recommendationId={r.id} status={r.status} title={r.title} />
      </div>
    </Card>
  );
}
