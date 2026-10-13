import { ArrowRight, BellRing, CircleCheck, CircleMinus, Mail, Printer, Swords, TrendingDown } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

import { ScoreRing } from "@/components/dashboard/score-ring";
import { ShareOfVoice } from "@/components/dashboard/share-of-voice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PROVIDER_META } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/services/metrics/aggregate";
import { SCORE_WEIGHTS } from "@/services/scoring";
import { PROVIDER_IDS, QUERY_CATEGORIES, type ShareOfVoiceSlice } from "@/types/domain";

import { EXAMPLE_BUSINESS, EXAMPLE_SCORE } from "./example-data";

/**
 * Compact product visuals for the features page. Anything showing numbers or
 * business names is illustrative and carries an "Example" badge.
 */

function VisualCard({ title, example = true, children, className }: { title: string; example?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {example && <Badge variant="demo">Example</Badge>}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export function ScoreVisual() {
  const parts: Array<[string, number]> = [
    ["Mentioned", SCORE_WEIGHTS.mentioned],
    ["Recommended", SCORE_WEIGHTS.recommended],
    ["Position", SCORE_WEIGHTS.position],
    ["Your site cited", SCORE_WEIGHTS.citation],
    ["Sentiment", SCORE_WEIGHTS.sentiment],
  ];
  const max = Math.max(...parts.map(([, points]) => points));
  return (
    <VisualCard title="AI Visibility Score">
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <ScoreRing value={EXAMPLE_SCORE} size={148} />
        <div className="w-full flex-1">
          <p className="text-xs text-muted-foreground">Points available per monitored answer</p>
          <ul className="mt-3 space-y-2">
            {parts.map(([label, points]) => (
              <li key={label} className="flex items-center gap-3 text-[13px]">
                <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
                <span className="h-2 flex-1 rounded-full bg-surface-muted" aria-hidden="true">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(points / max) * 100}%` }} />
                </span>
                <span className="w-7 text-right font-semibold text-foreground tabular">{points}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </VisualCard>
  );
}

export function PlatformsVisual() {
  return (
    <VisualCard title="Monitored AI platforms" example={false}>
      <ul className="divide-y divide-border">
        {PROVIDER_IDS.map((id) => {
          const meta = PROVIDER_META[id];
          return (
            <li key={id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: meta.chartVar }} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {meta.name} <span className="font-normal text-subtle-foreground">by {meta.vendor}</span>
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{meta.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </VisualCard>
  );
}

const SAMPLE_QUESTIONS: Array<{ text: string; category: (typeof QUERY_CATEGORIES)[number] }> = [
  { text: "What are the best family dentists in Portland?", category: "best_of" },
  { text: "Can you recommend a gentle dentist for nervous patients?", category: "recommendation" },
  { text: "Emergency dentist open on Saturday near downtown Portland", category: "local" },
  { text: `Is ${EXAMPLE_BUSINESS.name} or Competitor A better for implants?`, category: "brand_comparison" },
];

export function QuestionsVisual() {
  return (
    <VisualCard title="Buyer questions">
      <ul className="flex flex-wrap gap-1.5" aria-label="Question categories">
        {QUERY_CATEGORIES.map((c) => (
          <li key={c}>
            <Badge variant="secondary">{CATEGORY_LABELS[c]}</Badge>
          </li>
        ))}
      </ul>
      <ul className="mt-5 space-y-2">
        {SAMPLE_QUESTIONS.map((q) => (
          <li key={q.text} className="flex flex-col gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className="text-[13px] text-foreground">{q.text}</span>
            <Badge variant="outline" className="self-start sm:self-auto">
              {CATEGORY_LABELS[q.category]}
            </Badge>
          </li>
        ))}
      </ul>
    </VisualCard>
  );
}

function Signal({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  const Icon = positive ? CircleCheck : CircleMinus;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Icon className={cn("size-4", positive ? "text-success" : "text-subtle-foreground")} aria-hidden="true" />
        {value}
      </p>
    </div>
  );
}

export function DetectionVisual() {
  return (
    <VisualCard title="Analysis of one AI answer">
      <p className="text-[13px] text-muted-foreground">
        Question: <span className="text-foreground">“What are the best family dentists in Portland?”</span>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Signal label="Mentioned" value="Yes" positive />
        <Signal label="Recommended" value="Yes" positive />
        <Signal label="Position" value="#2 of 5" positive />
        <Signal label="Sentiment" value="Positive" positive />
        <Signal label="Your site cited" value="No" positive={false} />
        <Signal label="Confidence" value="High" positive />
      </div>
      <blockquote className="mt-4 border-l-2 border-border-strong pl-3 text-[13px] leading-relaxed text-muted-foreground italic">
        “{EXAMPLE_BUSINESS.name} is a popular choice for families, with flexible hours and a friendly team.”
      </blockquote>
    </VisualCard>
  );
}

const SOV_SLICES: ShareOfVoiceSlice[] = [
  { key: "business", name: EXAMPLE_BUSINESS.name, kind: "business", mentions: 33, share: 27 },
  { key: "a", name: "Competitor A", kind: "competitor", mentions: 41, share: 34 },
  { key: "b", name: "Competitor B", kind: "competitor", mentions: 27, share: 22 },
  { key: "c", name: "Competitor C", kind: "competitor", mentions: 15, share: 12 },
  { key: "others", name: "Others", kind: "others", mentions: 6, share: 5 },
];

export function ShareOfVoiceVisual() {
  return (
    <VisualCard title="Share of AI recommendations">
      <ShareOfVoice slices={SOV_SLICES} competitorOrder={["a", "b", "c"]} />
    </VisualCard>
  );
}

const SOURCES = [
  { domain: "localreviews.example", label: "Review platform", count: 18, own: false },
  { domain: "dentistdirectory.example", label: "Industry directory", count: 13, own: false },
  { domain: "citynews.example", label: "Local news", count: 7, own: false },
  { domain: "lakesidedental.example", label: "Your website", count: 5, own: true },
];

export function SourcesVisual() {
  const max = Math.max(...SOURCES.map((s) => s.count));
  return (
    <VisualCard title="Most-cited sources">
      <ul className="space-y-3.5">
        {SOURCES.map((s) => (
          <li key={s.domain}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate">
                <span className="font-medium text-foreground">{s.domain}</span>
                <span className="ml-2 text-subtle-foreground">{s.label}</span>
              </span>
              <span className="shrink-0 font-semibold text-foreground tabular">{s.count} citations</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-surface-muted" aria-hidden="true">
              <div
                className="h-full rounded-full"
                style={{ width: `${(s.count / max) * 100}%`, background: s.own ? "var(--series-1)" : "var(--chart-muted)" }}
              />
            </div>
          </li>
        ))}
      </ul>
    </VisualCard>
  );
}

export function RecommendationVisual() {
  return (
    <VisualCard title="Recommendation">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="warning">High impact</Badge>
        <Badge variant="secondary">Content</Badge>
      </div>
      <p className="mt-3 text-[15px] font-semibold tracking-tight text-foreground">Create a comparison page.</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        6 of your 40 monitored questions ask how options compare, and AI answers name Competitor A and B but not you.
      </p>
      <ol className="mt-4 space-y-2 text-[13px] text-foreground">
        {["List the alternatives buyers compare you with", "Explain honestly who each option suits best", "Link the page from your services and pricing pages"].map(
          (step, i) => (
            <li key={step} className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-muted-foreground tabular">
                {i + 1}
              </span>
              {step}
            </li>
          ),
        )}
      </ol>
    </VisualCard>
  );
}

const HISTORY = [58, 61, 60, 64, 66, 65, 69, 72];

export function HistoryVisual() {
  const w = 320;
  const h = 120;
  const pad = 6;
  const x = (i: number) => pad + (i / (HISTORY.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / 100) * (h - pad * 2);
  const path = HISTORY.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const first = HISTORY[0];
  const last = HISTORY[HISTORY.length - 1];
  return (
    <VisualCard title="AI Visibility Score, last 8 weekly scans">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={`Score rose from ${first} to ${last} over eight weekly scans`}>
        {[25, 50, 75].map((g) => (
          <line key={g} x1={0} x2={w} y1={y(g)} y2={y(g)} stroke="var(--chart-grid)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={path} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={x(HISTORY.length - 1)} cy={y(last)} r="3.5" fill="var(--series-1)" />
      </svg>
      <div className="mt-3 flex items-center justify-between text-[13px]">
        <span className="text-muted-foreground">
          8 weeks ago <span className="font-semibold text-foreground tabular">{first}</span>
        </span>
        <span className="text-muted-foreground">
          This week <span className="font-semibold text-foreground tabular">{last}</span>
        </span>
      </div>
    </VisualCard>
  );
}

export function ReportsVisual({ whiteLabelPlans }: { whiteLabelPlans: string }) {
  return (
    <VisualCard title="AI visibility report">
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <p className="text-[13px] font-semibold text-foreground">{EXAMPLE_BUSINESS.name}</p>
            <p className="text-xs text-muted-foreground">Monthly AI visibility report</p>
          </div>
          <span className="text-2xl font-semibold tracking-tight text-foreground tabular">{EXAMPLE_SCORE}</span>
        </div>
        <div className="mt-3 space-y-2" aria-hidden="true">
          <div className="h-2 w-11/12 rounded-full bg-surface-muted" />
          <div className="h-2 w-9/12 rounded-full bg-surface-muted" />
          <div className="h-2 w-10/12 rounded-full bg-surface-muted" />
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
        <li className="flex items-center gap-2">
          <Printer className="size-4" aria-hidden="true" />
          Print-ready layout
        </li>
        <li className="flex items-center gap-2">
          <Mail className="size-4" aria-hidden="true" />
          Weekly email summary
        </li>
      </ul>
      <p className="mt-3 text-xs text-subtle-foreground">White-label reports with your own brand name on {whiteLabelPlans}.</p>
    </VisualCard>
  );
}

const ALERTS = [
  {
    icon: TrendingDown,
    title: "Visibility dropped 8 points",
    body: `${EXAMPLE_BUSINESS.name} fell from 76 to 68 on Gemini since the last scan.`,
    tone: "warning" as const,
  },
  {
    icon: Swords,
    title: "Competitor A overtook you",
    body: "Competitor A now has a higher AI Visibility Score than you.",
    tone: "danger" as const,
  },
  {
    icon: BellRing,
    title: "Scan completed",
    body: "40 questions checked across 3 AI platforms.",
    tone: "neutral" as const,
  },
];

export function AlertsVisual() {
  return (
    <VisualCard title="Alerts">
      <ul className="space-y-2">
        {ALERTS.map(({ icon: Icon, title, body, tone }) => (
          <li key={title} className="flex gap-3 rounded-lg border border-border bg-background p-3">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                tone === "warning" && "bg-warning-soft text-warning-text",
                tone === "danger" && "bg-danger-soft text-danger-text",
                tone === "neutral" && "bg-surface-muted text-muted-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </VisualCard>
  );
}

export function FreeCheckVisual() {
  const steps = ["Enter your business name and website", "We check a sample of buyer questions", "Get a snapshot of your AI visibility"];
  return (
    <VisualCard title="Free AI visibility check" example={false}>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-sm text-foreground">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-muted-foreground tabular">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <Button asChild className="mt-6 w-full sm:w-auto">
        <Link href="/free-ai-visibility-check">
          Check My AI Visibility
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </VisualCard>
  );
}

const CLIENTS = [
  { name: "Lakeside Dental", industry: "Dental clinic", score: 72 },
  { name: "Northwind Bikes", industry: "E-commerce", score: 58 },
  { name: "Juniper Legal", industry: "Law firm", score: 81 },
  { name: "Brightpath CRM", industry: "SaaS", score: 44 },
];

export function AgencyVisual() {
  return (
    <VisualCard title="Client projects">
      <ul className="divide-y divide-border">
        {CLIENTS.map((c) => (
          <li key={c.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs font-semibold text-muted-foreground"
              aria-hidden="true"
            >
              {c.name
                .split(" ")
                .map((w) => w[0])
                .join("")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.industry}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="hidden h-1.5 w-16 rounded-full bg-surface-muted sm:block" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${c.score}%` }} />
              </span>
              <span className="w-12 text-right text-sm font-semibold text-foreground tabular">
                {c.score}
                <span className="text-xs font-normal text-subtle-foreground">/100</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </VisualCard>
  );
}
