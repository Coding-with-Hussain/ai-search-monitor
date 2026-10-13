import { ChartColumn, Lightbulb, MessageSquareText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TRIAL_DAYS } from "@/lib/billing/plans";

const BENEFITS = [
  {
    icon: MessageSquareText,
    title: "Monitor real buyer questions",
    text: "See how ChatGPT, Gemini and Perplexity answer the questions your customers ask.",
  },
  {
    icon: ChartColumn,
    title: "Compare with competitors",
    text: "Find out which businesses AI answers mention, and where you stand next to them.",
  },
  {
    icon: Lightbulb,
    title: "Know what to improve",
    text: "Get practical next steps based on the signals observed in monitored AI answers.",
  },
] as const;

/** Calm value-proposition panel shown beside auth forms on large screens. */
export function AuthBrandPanel() {
  return (
    <div className="relative flex h-full min-h-dvh flex-col justify-center overflow-hidden px-12 py-16 xl:px-20">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-md">
        <p className="text-[13px] font-medium text-primary">AI search visibility monitoring</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground">
          Does AI recommend your business?
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          More customers ask AI assistants what to buy and who to choose. See when you&apos;re part of the answer.
        </p>

        <ul className="mt-10 flex flex-col gap-6">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-primary shadow-card">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">{title}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <ExampleInsight />

        <p className="mt-8 text-xs text-subtle-foreground">
          {TRIAL_DAYS}-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </div>
  );
}

function ExampleInsight() {
  return (
    <figure className="mt-10 rounded-xl border border-border bg-surface p-5 shadow-pop">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5" aria-hidden="true">
            <span className="animate-ping-soft absolute inline-flex size-full rounded-full bg-series-1" />
            <span className="relative inline-flex size-2.5 rounded-full bg-series-1" />
          </span>
          <span className="text-[13px] font-medium text-foreground">ChatGPT</span>
          <span className="text-xs text-subtle-foreground">· monitored AI answer</span>
        </div>
        <Badge variant="outline">Example</Badge>
      </div>
      <blockquote className="mt-4 text-[15px] leading-snug text-foreground">
        ChatGPT recommended you <span className="font-semibold">#2</span> for{" "}
        <span className="font-medium">&ldquo;best dental implant clinic in Lahore&rdquo;</span>
      </blockquote>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-xs">
        <div>
          <dt className="text-subtle-foreground">Mentioned</dt>
          <dd className="mt-0.5 font-medium text-foreground">Yes</dd>
        </div>
        <div>
          <dt className="text-subtle-foreground">Position</dt>
          <dd className="mt-0.5 font-medium text-foreground tabular">#2 of 5</dd>
        </div>
        <div>
          <dt className="text-subtle-foreground">Sentiment</dt>
          <dd className="mt-0.5 font-medium text-foreground">Positive</dd>
        </div>
      </dl>
      <figcaption className="mt-4 text-[11.5px] leading-relaxed text-subtle-foreground">
        Illustrative example. AI answers can vary between runs.
      </figcaption>
    </figure>
  );
}
