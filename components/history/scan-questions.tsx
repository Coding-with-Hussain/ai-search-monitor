import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS } from "@/services/metrics/aggregate";
import type { QuerySummary } from "@/types/domain";

const INITIAL = 10;

function resultLabel(q: QuerySummary) {
  if (q.recommendedIn > 0) return { text: q.bestPosition ? `Recommended #${q.bestPosition}` : "Recommended", variant: "success" as const };
  if (q.mentionedIn > 0) return { text: "Mentioned", variant: "default" as const };
  return { text: "Not mentioned", variant: "secondary" as const };
}

function QuestionItem({ q, href }: { q: QuerySummary; href: string | null }) {
  const result = resultLabel(q);
  return (
    <li className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:gap-4">
      <div className="min-w-0 flex-1">
        {href ? (
          <Link href={href} className="text-sm leading-snug font-medium text-pretty hover:text-primary hover:underline">
            {q.text}
          </Link>
        ) : (
          <p className="text-sm leading-snug font-medium text-pretty">{q.text}</p>
        )}
        <p className="mt-0.5 text-xs text-subtle-foreground">{CATEGORY_LABELS[q.category] ?? q.category}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular">
        <Badge variant={result.variant}>{result.text}</Badge>
        <span>
          Mentioned {q.mentionedIn}/{q.runs}
        </span>
        <span>
          Recommended {q.recommendedIn}/{q.runs}
        </span>
        <span className="font-medium text-foreground">Score {Math.round(q.score)}</span>
        {href && <ChevronRight className="hidden size-4 text-subtle-foreground md:block" aria-hidden="true" />}
      </div>
    </li>
  );
}

/**
 * Per-question results of one scan, weakest first. Each question links to its
 * detail page scoped to this scan; the rest of the list expands natively.
 */
export function ScanQuestions({ projectId, scanId, queries }: { projectId: string; scanId: string; queries: QuerySummary[] }) {
  if (queries.length === 0) {
    return <p className="text-sm text-muted-foreground">No questions were analyzed in this scan.</p>;
  }
  const sorted = [...queries].sort((a, b) => a.score - b.score || a.text.localeCompare(b.text));
  const hrefFor = (q: QuerySummary) => (q.queryId ? `/projects/${projectId}/queries/${q.queryId}?scan=${scanId}` : null);
  const head = sorted.slice(0, INITIAL);
  const rest = sorted.slice(INITIAL);
  return (
    <div>
      <ul className="divide-y divide-border">
        {head.map((q, i) => (
          <QuestionItem key={`${q.queryId ?? q.text}-${i}`} q={q} href={hrefFor(q)} />
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="group border-t border-border">
          <summary className="cursor-pointer list-none py-3 text-[13px] font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show {rest.length} more {rest.length === 1 ? "question" : "questions"}</span>
            <span className="hidden group-open:inline">Show fewer questions</span>
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {rest.map((q, i) => (
              <QuestionItem key={`${q.queryId ?? q.text}-rest-${i}`} q={q} href={hrefFor(q)} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
