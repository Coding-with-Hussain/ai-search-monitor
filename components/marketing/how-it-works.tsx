import { Radar, Store, Wrench } from "lucide-react";

import { Container, Section, SectionHeading } from "./container";

const STEPS = [
  {
    icon: Store,
    title: "Add your business",
    body: "Enter your website, industry and location. We suggest the buyer questions your customers actually ask, and you choose the competitors to track.",
    detail: "Guided setup, no code or integration",
  },
  {
    icon: Radar,
    title: "Monitor AI recommendations",
    body: "We ask ChatGPT, Gemini and Perplexity those questions on your schedule and record whether you are mentioned, recommended or cited, and who appears instead.",
    detail: "Weekly, monthly or on demand",
  },
  {
    icon: Wrench,
    title: "Fix what is holding you back",
    body: "Get prioritized recommendations based on observed signals, from missing comparison pages to weak third-party authority, then track whether your visibility improves.",
    detail: "Clear next actions, not jargon",
  },
];

export function HowItWorks() {
  return (
    <Section aria-labelledby="how-title">
      <Container>
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="From blind spot to action plan in three steps."
          description="No setup projects, no technical integration. If you can describe your business, you can monitor it."
          align="center"
        />
        <ol className="mt-14 grid gap-4 md:grid-cols-3 md:gap-6">
          {STEPS.map(({ icon: Icon, title, body, detail }, i) => (
            <li key={title} className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-primary">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span className="text-xs font-medium text-subtle-foreground">Step {i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <p className="mt-5 border-t border-border pt-4 text-[13px] font-medium text-foreground">{detail}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
