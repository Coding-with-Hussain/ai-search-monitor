import { BellRing, ChartPie, MessageSquareText } from "lucide-react";

import { CompetitorBars } from "@/components/dashboard/competitor-comparison";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatPercent } from "@/lib/format";

import { Container, Section, SectionHeading } from "./container";
import { EXAMPLE_COMPETITORS } from "./example-data";

const POINTS = [
  {
    icon: ChartPie,
    title: "Share of voice",
    body: "See what share of AI recommendations goes to you versus each competitor.",
  },
  {
    icon: MessageSquareText,
    title: "Question by question",
    body: "Find the exact buyer questions where a competitor is named and you are not.",
  },
  {
    icon: BellRing,
    title: "Overtake alerts",
    body: "Get notified when a competitor moves ahead of you in monitored answers.",
  },
];

export function CompetitorSection() {
  const you = EXAMPLE_COMPETITORS.find((e) => e.isYou) ?? EXAMPLE_COMPETITORS[0];
  const leader = [...EXAMPLE_COMPETITORS].sort((a, b) => b.metrics.score - a.metrics.score)[0];

  return (
    <Section tone="muted" aria-labelledby="competitors-title">
      <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
        <Card className="order-2 p-6 sm:p-7 lg:order-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">AI Visibility Score by business</p>
            <Badge variant="demo">Example data</Badge>
          </div>
          <div className="mt-6">
            <CompetitorBars entities={EXAMPLE_COMPETITORS} />
          </div>
          {!leader.isYou && (
            <p className="mt-6 rounded-lg border border-border bg-surface-muted/60 p-3.5 text-[13px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{leader.name}</span> is mentioned in{" "}
              {formatPercent(leader.metrics.mentionRate)} of monitored answers, compared with{" "}
              {formatPercent(you.metrics.mentionRate)} for {you.name}.
            </p>
          )}
        </Card>

        <div className="order-1 lg:order-2">
          <SectionHeading
            id="competitors-title"
            eyebrow="Competitor intelligence"
            title="Know which competitors AI recommends."
            description="Competitors can appear in AI answers far more often than you, even when you outrank them on Google. See who shows up, how often and for which questions, so you know exactly what you are up against."
          />
          <ul className="mt-10 space-y-5">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
