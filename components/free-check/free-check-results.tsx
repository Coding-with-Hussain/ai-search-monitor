import { ArrowRight, CircleCheck, CircleX, Lightbulb, RotateCcw } from "lucide-react";
import Link from "next/link";

import { ScoreRing } from "@/components/dashboard/score-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/format";
import { providerName } from "@/lib/providers-meta";
import type { FreeCheckResult } from "@/types/free-check";

function statusLabel(q: FreeCheckResult["questions"][number]) {
  if (q.recommended && q.position) return `Recommended #${q.position}`;
  if (q.recommended) return "Recommended";
  if (q.mentioned) return "Mentioned";
  return "Not mentioned";
}

export function FreeCheckResults({ result, onReset }: { result: FreeCheckResult; onReset: () => void }) {
  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      {result.isSimulation && (
        <div className="rounded-xl border border-dashed border-warning/60 bg-warning-soft px-4 py-3 text-[13px] text-warning-text">
          <strong>Simulated preview.</strong> These answers were simulated (no real AI assistant was asked) and analyzed by the same engine
          used for live monitoring. Create an account to monitor real answers from ChatGPT, Gemini and Perplexity.
        </div>
      )}

      <Card className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <ScoreRing value={result.score} size={148} stroke={11} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">AI visibility for</p>
          <h2 className="text-xl font-semibold tracking-tight">{result.businessName}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:max-w-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Mentioned in</dt>
              <dd className="text-lg font-semibold">{formatPercent(result.mentionRate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Recommended in</dt>
              <dd className="text-lg font-semibold">{formatPercent(result.recommendationRate)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-subtle-foreground">
            Based on {result.questions.length} AI answers. AI answers can vary between runs; this is a quick snapshot, not a ranking.
          </p>
        </div>
      </Card>

      <Card className="border-primary/30 bg-primary-soft/40">
        <CardContent className="flex gap-3 pt-5">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold">{result.topIssue.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{result.topIssue.detail}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>What AI said</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {result.questions.map((q, i) => (
                <li key={`${q.provider}-${i}`} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium">&ldquo;{q.text}&rdquo;</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">{providerName(q.provider)}</Badge>
                    <Badge variant={q.recommended ? "success" : q.mentioned ? "warning" : "danger"}>
                      {q.mentioned ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
                      {statusLabel(q)}
                    </Badge>
                    {q.recommendedInstead.length > 0 && (
                      <span className="text-muted-foreground">
                        {q.mentioned ? "Also recommended" : "Recommended instead"}: {q.recommendedInstead.slice(0, 3).join(", ")}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>By AI platform</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {result.providers.map((p) => (
                <div key={p.provider} className="flex items-center justify-between text-sm">
                  <span>{providerName(p.provider)}</span>
                  <span className="tabular text-muted-foreground">
                    mentioned {p.mentioned}/{p.total} · <span className="font-semibold text-foreground">{Math.round(p.score)}</span>/100
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Who AI recommends most</CardTitle>
            </CardHeader>
            <CardContent>
              {result.competitors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No other businesses were recommended in these answers.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {result.competitors.map((c, i) => (
                    <li key={c.name} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate">
                        <span className="mr-2 text-subtle-foreground tabular">{i + 1}.</span>
                        {c.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {c.mentions} answer{c.mentions === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold tracking-tight">Monitor your AI visibility every week.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Track more questions, competitors and platforms over time — with specific recommendations to improve.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/signup">
              Start Monitoring <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/demo">View Demo</Link>
          </Button>
        </div>
      </Card>

      <Button variant="ghost" className="self-start" onClick={onReset}>
        <RotateCcw /> Check another business
      </Button>
    </div>
  );
}
