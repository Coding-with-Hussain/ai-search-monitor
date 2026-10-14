import { ArrowRight, Building2, Clock, FlaskConical, Globe, MapPin, MessagesSquare, Radar } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { formatDate, formatNumber } from "@/lib/format";
import { PROVIDER_META } from "@/lib/providers-meta";
import type { BusinessContext, ProviderId } from "@/types/domain";

/** Primary + secondary calls to action used on the public demo. */
export function DemoCtas({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Button asChild size="lg">
        <Link href="/free-ai-visibility-check">
          Check My AI Visibility
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href="/signup">Start Monitoring</Link>
      </Button>
    </div>
  );
}

/** Page intro for /demo. */
export function DemoIntro({ businessName, weeks }: { businessName: string; weeks: number }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 text-[13px] font-medium text-primary">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          Live demo
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl">
          See how AI assistants answer your customers
        </h1>
        <p className="mt-3 text-base leading-relaxed text-pretty text-muted-foreground">
          This is the dashboard you get for every business you monitor. It follows {businessName}, a sample dental clinic,
          across ChatGPT, Gemini and Perplexity for {weeks} weeks: how often it is mentioned and recommended, how it
          compares with competitors, and what to improve next.
        </p>
      </div>
      <DemoCtas className="flex shrink-0 flex-col gap-3 sm:flex-row" />
    </div>
  );
}

/** The prominent "this is simulated" notice. Always shown above the demo dashboard. */
export function DemoBanner() {
  return (
    <div
      role="note"
      aria-label="About this demo"
      className="flex items-start gap-3 rounded-xl border border-dashed border-warning/60 bg-warning-soft px-4 py-3.5 text-warning-text"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 text-[13px] leading-relaxed">
        <p className="text-sm font-semibold">Demo data — simulated AI answers for a sample business</p>
        <p className="mt-0.5">
          The business and competitors are fictional examples. No real AI assistant was asked: the answers were simulated,
          then analyzed and scored by the same engine used for live monitoring.
        </p>
      </div>
    </div>
  );
}

function Item({ icon: Icon, label, children }: { icon: typeof Globe; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
      <dt className="sr-only">{label}</dt>
      <dd className="truncate">{children}</dd>
    </div>
  );
}

/** Business summary shown where the app renders the project header. */
export function DemoBusinessSummary({
  business,
  providers,
  questionCount,
  scannedAt,
}: {
  business: BusinessContext;
  providers: ProviderId[];
  questionCount: number;
  scannedAt: string;
}) {
  const location = [business.city, business.country].filter(Boolean).join(", ");
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="truncate text-xl font-semibold tracking-tight">{business.name}</h2>
        <Badge variant="demo">Sample business</Badge>
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground">
        {business.domain && (
          <Item icon={Globe} label="Website">
            {business.domain}
          </Item>
        )}
        <Item icon={Building2} label="Industry">
          {business.industry}
        </Item>
        {location && (
          <Item icon={MapPin} label="Location">
            {location}
          </Item>
        )}
        <Item icon={MessagesSquare} label="Monitored questions">
          <span title={providers.map((p) => PROVIDER_META[p].name).join(", ")}>
            {formatNumber(questionCount)} questions on {providers.length} AI platforms
          </span>
        </Item>
        <Item icon={Radar} label="Monitoring">
          Weekly
        </Item>
        <Item icon={Clock} label="Last scan">
          Last scan: {formatDate(scannedAt)}
        </Item>
      </dl>
    </div>
  );
}

/** Closing call to action under the demo dashboard. */
export function DemoClosingCta() {
  return (
    <section
      aria-labelledby="demo-cta-title"
      className="rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-card sm:px-12 sm:py-16"
    >
      <h2 id="demo-cta-title" className="text-2xl font-semibold tracking-[-0.02em] text-balance sm:text-3xl">
        See the same view for your business
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-pretty text-muted-foreground">
        Run a free check with no signup, or start monitoring your own questions and competitors with a {TRIAL_DAYS}-day
        free trial.
      </p>
      <DemoCtas className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center" />
    </section>
  );
}
