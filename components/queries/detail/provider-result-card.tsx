import { ChevronDown } from "lucide-react";
import type * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { QueryRunDetail } from "@/db/repositories/analysis";
import { PROVIDER_META } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import { SCORE_WEIGHTS, scoreBreakdown } from "@/services/scoring";
import type { ProviderId } from "@/types/domain";

import { AnswerSources } from "./answer-sources";
import { runIssue } from "./insights";

const SENTIMENT_LABEL = { positive: "Positive", neutral: "Neutral", negative: "Negative" } as const;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium">{children}</dd>
    </div>
  );
}

function Disclosure({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-lg border border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] font-medium select-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown className="size-4 shrink-0 text-subtle-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-border px-3 py-3">{children}</div>
    </details>
  );
}

/** One AI platform's answer to the question: outcome, score breakdown, evidence, full answer and sources. */
export function ProviderResultCard({
  provider,
  run,
  ownDomain,
  competitorDomains,
}: {
  provider: ProviderId;
  run: QueryRunDetail | null;
  ownDomain: string | null;
  competitorDomains: Array<{ domain: string; name: string }>;
}) {
  const meta = PROVIDER_META[provider];
  const a = run?.analysis ?? null;
  const issue = run ? runIssue(run) : { label: "Not checked", detail: "This AI platform wasn't part of this scan." };
  const breakdown = a
    ? scoreBreakdown({ mentioned: a.mentioned, recommended: a.recommended, position: a.position, sentiment: a.sentiment, citation: a.citation })
    : null;

  const status = a
    ? a.mentioned
      ? { label: "Mentioned", variant: "success" as const }
      : { label: "Not mentioned", variant: "secondary" as const }
    : issue?.label === "Failed"
      ? { label: "Failed", variant: "danger" as const }
      : issue?.label === "In progress"
        ? { label: "In progress", variant: "default" as const }
        : { label: issue?.label ?? "Unavailable", variant: "outline" as const };

  return (
    <Card className="flex min-w-0 flex-col">
      <section aria-label={`${meta.name} answer`} className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] leading-snug font-semibold tracking-tight">{meta.name}</h3>
            <p className="text-xs text-muted-foreground">{meta.vendor}</p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {!a ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">{issue?.detail}</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Fact label="Position">{a.recommended && a.position ? `#${a.position}` : "—"}</Fact>
              <Fact label="Recommended">{a.recommended ? "Yes" : "No"}</Fact>
              <Fact label="Sentiment">{a.mentioned && a.sentiment ? SENTIMENT_LABEL[a.sentiment] : "—"}</Fact>
              <Fact label="Your website cited">{a.citation ? "Yes" : "No"}</Fact>
              <Fact label="Confidence">{`${Math.round(a.confidence * 100)}%`}</Fact>
              <Fact label="Analysis">{a.analyzer === "llm" ? "AI-assisted" : "Rule-based"}</Fact>
            </dl>

            {breakdown && (
              <div className="rounded-lg bg-surface-muted/60 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Result score</p>
                  <p className="tabular">
                    <span className="text-xl font-semibold tracking-tight">{Math.round(breakdown.total)}</span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </p>
                </div>
                <dl className="mt-2 space-y-1 text-xs tabular">
                  {(
                    [
                      ["Mentioned", breakdown.mentioned, SCORE_WEIGHTS.mentioned],
                      ["Recommended", breakdown.recommended, SCORE_WEIGHTS.recommended],
                      ["Position", breakdown.position, SCORE_WEIGHTS.position],
                      ["Website cited", breakdown.citation, SCORE_WEIGHTS.citation],
                      ["Sentiment", breakdown.sentiment, SCORE_WEIGHTS.sentiment],
                    ] as const
                  ).map(([label, value, max]) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className={cn(value > 0 ? "font-medium text-foreground" : "text-subtle-foreground")}>
                        {value} / {max}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {a.evidence ? (
              <figure>
                <figcaption className="mb-1.5 text-xs font-medium text-muted-foreground">Evidence from the answer</figcaption>
                <blockquote className="border-l-2 border-border-strong pl-3 text-[13px] leading-relaxed break-words whitespace-pre-line text-foreground">
                  {a.evidence}
                </blockquote>
              </figure>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                {a.mentioned ? "No short excerpt was extracted for this answer." : "Your business does not appear in this answer."}
              </p>
            )}
            {a.explanation && <p className="text-[13px] leading-relaxed text-muted-foreground">{a.explanation}</p>}
          </>
        )}

        {run?.responseText && (
          <Disclosure summary="Show full AI answer">
            <div className="max-h-96 overflow-y-auto text-[13px] leading-relaxed break-words whitespace-pre-wrap text-foreground">
              {run.responseText}
            </div>
          </Disclosure>
        )}

        {run && run.status === "completed" && (
          <div>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">Cited sources</h4>
            <AnswerSources citations={run.citations} ownDomain={ownDomain} competitorDomains={competitorDomains} />
          </div>
        )}

        {run && (run.model || run.isMock) && (
          <p className="mt-auto border-t border-border pt-3 text-xs break-words text-subtle-foreground">
            {run.model ? `Model: ${run.model}` : "Model not reported"}
            {run.isMock ? " · Simulated answer" : ""}
            {a?.analyzer === "llm" && a.analyzerModel ? ` · Analyzed with ${a.analyzerModel}` : ""}
          </p>
        )}
      </section>
    </Card>
  );
}
