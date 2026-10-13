import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TRIAL_DAYS } from "@/lib/billing/plans";

import { Container } from "./container";
import { DashboardPreview } from "./dashboard-preview";
import { RadarBackdrop } from "./radar-backdrop";

const TRUST_POINTS = ["Free check, no signup", `${TRIAL_DAYS}-day free trial`, "No credit card required"];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid opacity-70 [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,black_35%,transparent_100%)]"
      />
      <RadarBackdrop
        id="hero-radar"
        className="absolute top-[-360px] left-1/2 size-[880px] -translate-x-1/2 opacity-80 [mask-image:radial-gradient(circle_at_50%_50%,black_25%,transparent_70%)] sm:top-[-420px] sm:size-[1040px]"
      />

      <Container className="relative pt-16 pb-12 text-center sm:pt-24 sm:pb-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[13px] font-medium text-muted-foreground shadow-card">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full rounded-full bg-primary animate-ping-soft" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          Monitoring ChatGPT, Gemini and Perplexity
        </p>

        <h1
          id="hero-title"
          className="mx-auto mt-6 max-w-3xl text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance text-foreground sm:text-6xl lg:text-7xl"
        >
          Does AI recommend your business?
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          Track how ChatGPT, Gemini and Perplexity mention your business when customers ask what to buy, where to go,
          and who to choose.
        </p>

        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="px-6">
            <Link href="/free-ai-visibility-check">
              Check My AI Visibility
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="px-6">
            <Link href="/demo">View Demo</Link>
          </Button>
        </div>

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
          {TRUST_POINTS.map((point) => (
            <li key={point} className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-primary" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </Container>

      <Container className="relative pb-20 sm:pb-28">
        <DashboardPreview />
      </Container>
    </section>
  );
}
