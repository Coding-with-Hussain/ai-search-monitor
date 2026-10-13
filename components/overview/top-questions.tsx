import { ArrowRight, ChevronRight, MessagesSquare } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROVIDER_META } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/services/metrics/aggregate";
import type { ProviderId, QuerySummary } from "@/types/domain";

import { overviewLinks, PRIORITY_BADGE, PRIORITY_LABEL, questionStatus, topQuestions } from "./helpers";
import { SectionCard } from "./section-card";
import type { ProjectOverviewData } from "./types";

const LIMIT = 6;

type ProviderResult = NonNullable<QuerySummary["providers"][ProviderId]>;

function providerState(r: ProviderResult | undefined): { label: string; dot: string } {
  if (!r) return { label: "no result", dot: "border border-dashed border-border-strong" };
  if (r.recommended) return { label: r.position ? `recommended #${r.position}` : "recommended", dot: "bg-success" };
  if (r.mentioned) return { label: "mentioned, not recommended", dot: "bg-warning" };
  return { label: "not mentioned", dot: "border border-border-strong bg-surface" };
}

/** The most important monitored questions and how each platform answered. */
export function TopQuestions({ data }: { data: ProjectOverviewData }) {
  const links = overviewLinks(data);
  const questions = topQuestions(data.metrics.queries, LIMIT);
  const providers = data.metrics.providers.filter((p) => p.status !== "unavailable").map((p) => p.provider);

  const viewAll = links.queries ? (
    <Button asChild variant="ghost" size="sm">
      <Link href={links.queries}>
        View all questions
        <ArrowRight aria-hidden="true" />
      </Link>
    </Button>
  ) : (
    <Button asChild variant="ghost" size="sm">
      <Link href={links.signup}>
        Track your own questions
        <ArrowRight aria-hidden="true" />
      </Link>
    </Button>
  );

  return (
    <SectionCard
      className="lg:col-span-2"
      title="Top questions"
      description="Your most important monitored questions, high priority and weakest results first."
      actions={viewAll}
      bodyClassName="px-0 pb-0"
    >
      {questions.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            icon={MessagesSquare}
            className="py-8"
            title="No questions in this scan"
            description="Questions appear here once a scan has analyzed them."
          />
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border border-t border-border">
            {questions.map((q) => {
              const status = questionStatus(q);
              const href = links.query(q.queryId);
              return (
                <li
                  key={q.queryId ?? q.text}
                  className={cn(
                    "relative flex items-start gap-3 px-5 py-3.5",
                    href && "transition-colors focus-within:bg-surface-muted/60 hover:bg-surface-muted/60",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug font-medium text-pretty">
                      {href ? (
                        <Link href={href} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
                          {q.text}
                        </Link>
                      ) : (
                        q.text
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <Badge variant={status.tone}>{status.label}</Badge>
                      <Badge variant={PRIORITY_BADGE[q.priority]}>{PRIORITY_LABEL[q.priority]}</Badge>
                      <span className="text-xs text-subtle-foreground">{CATEGORY_LABELS[q.category]}</span>
                      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Result by AI platform">
                        {providers.map((p) => {
                          const state = providerState(q.providers[p]);
                          return (
                            <li key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className={cn("size-2 shrink-0 rounded-full", state.dot)} aria-hidden="true" />
                              {PROVIDER_META[p].name}
                              <span className="sr-only">: {state.label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                  {href && <ChevronRight className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-5 py-3 text-xs text-muted-foreground" aria-hidden="true">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success" /> Recommended
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-warning" /> Mentioned only
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full border border-border-strong bg-surface" /> Not mentioned
            </span>
          </div>
        </>
      )}
    </SectionCard>
  );
}
