import { ScoreRing } from "@/components/dashboard/score-ring";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PROVIDER_META } from "@/lib/providers-meta";
import { SCORE_WEIGHTS } from "@/services/scoring";

import { Container, Section, SectionHeading } from "./container";
import { EXAMPLE_PLATFORM_SCORES, EXAMPLE_SCORE } from "./example-data";
import { SCORE_DISCLAIMER, SCORE_NOT_A_RANKING } from "./plan-copy";
import { PlatformScores } from "./platform-scores";

const COMPONENTS: Array<{ key: keyof typeof SCORE_WEIGHTS; label: string; body: string; upTo?: boolean }> = [
  { key: "mentioned", label: "Mentioned", body: "Your business appears in the answer." },
  { key: "recommended", label: "Recommended", body: "The answer actively suggests you." },
  { key: "position", label: "Position", body: "How close to the top of the list you appear.", upTo: true },
  { key: "citation", label: "Your site cited", body: "Your own website is used as a source." },
  { key: "sentiment", label: "Sentiment", body: "How positively you are described.", upTo: true },
];

export function ScoreSection() {
  const sorted = [...EXAMPLE_PLATFORM_SCORES].sort((a, b) => a.score - b.score);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  return (
    <Section aria-labelledby="score-title" className="border-t border-border">
      <Container className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHeading
            id="score-title"
            eyebrow="AI Visibility Score"
            title="Track your visibility across AI search."
            description="One clear number for how visible your business is inside monitored AI answers, broken down by platform so you know where to focus first."
          />
          <dl className="mt-10 divide-y divide-border border-y border-border">
            {COMPONENTS.map((c) => (
              <div key={c.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 py-3.5">
                <dt className="text-sm font-medium text-foreground">{c.label}</dt>
                <dd className="row-span-2 text-right text-sm font-semibold text-foreground tabular">
                  {c.upTo && <span className="mr-1 text-xs font-normal text-subtle-foreground">up to</span>}
                  {SCORE_WEIGHTS[c.key]} pts
                </dd>
                <dd className="text-[13px] text-muted-foreground">{c.body}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[13px] leading-relaxed text-subtle-foreground">
            {SCORE_NOT_A_RANKING} {SCORE_DISCLAIMER}
          </p>
        </div>

        <Card className="p-6 sm:p-8 lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">AI Visibility Score</p>
            <Badge variant="demo">Example data</Badge>
          </div>
          <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row sm:items-center">
            <ScoreRing value={EXAMPLE_SCORE} size={176} stroke={14} />
            <PlatformScores scores={EXAMPLE_PLATFORM_SCORES} className="w-full flex-1" />
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface-muted/60 p-4">
              <p className="text-xs text-muted-foreground">Strongest platform</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {PROVIDER_META[strongest.provider].name} · {strongest.score}/100
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted/60 p-4">
              <p className="text-xs text-muted-foreground">Biggest opportunity</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {PROVIDER_META[weakest.provider].name} · {weakest.score}/100
              </p>
            </div>
          </div>
        </Card>
      </Container>
    </Section>
  );
}
