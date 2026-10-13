import { Briefcase, Check, Code, FlaskConical, Lock, Scale, ShieldCheck, ShoppingBag, Store, UserRound, X } from "lucide-react";
import type { Metadata } from "next";

import { Container, Section, SectionHeading } from "@/components/marketing/container";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import { marketingMetadata } from "@/components/marketing/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = marketingMetadata({
  title: "About",
  description:
    "Why we built AI Search Visibility Monitor: honest measurement of how AI assistants recommend businesses, with no guarantees, no hype and clear labeling of simulated data.",
  path: "/about",
});

const AUDIENCES = [
  { icon: Store, title: "Local businesses", body: "Dentists, clinics, restaurants, trades and studios that customers find by asking “who’s best near me?”" },
  { icon: Code, title: "SaaS companies", body: "Software teams that want to appear when buyers ask AI for the best tool in their category." },
  { icon: ShoppingBag, title: "E-commerce brands", body: "Stores that want to be named when shoppers ask what to buy." },
  { icon: Briefcase, title: "Marketing and SEO agencies", body: "Teams that report on AI visibility for many clients." },
  { icon: UserRound, title: "Freelancers and consultants", body: "Independent experts who win work through recommendations." },
];

const PRINCIPLES = [
  {
    icon: Scale,
    title: "Honest measurement",
    body: "We report what monitored AI answers actually said, with evidence you can check. The AI Visibility Score is a proprietary monitoring metric with published weights, and we never present it as a search-engine ranking.",
  },
  {
    icon: ShieldCheck,
    title: "No guarantees, no hype",
    body: "AI answers change and can vary between runs. Nobody can guarantee that an AI assistant will recommend a business, and we never will. We show observed signals and practical next steps.",
  },
  {
    icon: Lock,
    title: "Privacy by default",
    body: "We collect only what monitoring needs. The questions sent to AI platforms are generic buyer questions, we never sell your data, and you can delete your projects or account at any time.",
  },
  {
    icon: FlaskConical,
    title: "Simulated data is always labeled",
    body: "Demo projects and accounts without live monitoring use simulated AI answers. Those results are always clearly marked, and simulated data is never presented as real.",
  },
];

const WE_DO = [
  "Ask AI platforms the questions your customers ask",
  "Record who is mentioned, recommended and cited",
  "Compare you fairly with the competitors you choose",
  "Explain the signals behind every recommendation",
];

const WE_DONT = [
  "Promise rankings or guaranteed AI recommendations",
  "Try to manipulate AI systems on your behalf",
  "Sell or share your data with advertisers",
  "Present simulated results as real measurements",
];

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About"
        title="Visibility inside AI."
        description="We help businesses understand how AI assistants talk about them, honestly, measurably and without hype."
      />

      <Section aria-labelledby="mission-title">
        <Container className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <SectionHeading
            id="mission-title"
            eyebrow="Our mission"
            title="Make AI recommendations measurable for every business."
          />
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              More and more customers skip the search results page and simply ask an AI assistant who to choose. The
              answer usually names a few businesses, and everyone else is invisible. Until now, there was no reliable way
              to know which side of that line you were on.
            </p>
            <p>
              Google tells you where you rank. {siteConfig.name} tells you whether AI recommends you. We monitor the
              answers that matter to your business, show how you compare with competitors and turn what we observe into
              clear, practical marketing actions.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="muted" aria-labelledby="audience-title">
        <Container>
          <SectionHeading id="audience-title" eyebrow="Who it’s for" title="Built for businesses that win on recommendations." />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AUDIENCES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-xl border border-border bg-background p-5">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section aria-labelledby="principles-title">
        <Container>
          <SectionHeading id="principles-title" eyebrow="Principles" title="How we work." />
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {PRINCIPLES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4 rounded-xl border border-border bg-surface p-6 shadow-card">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="text-base font-semibold">What we do</h3>
              <ul className="mt-4 space-y-3">
                {WE_DO.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="text-base font-semibold">What we don’t do</h3>
              <ul className="mt-4 space-y-3">
                {WE_DONT.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-foreground">
                    <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-10 text-sm text-muted-foreground">
            Questions, feedback or partnership ideas?{" "}
            <a href={`mailto:${siteConfig.supportEmail}`} className="font-medium text-primary underline-offset-4 hover:underline">
              {siteConfig.supportEmail}
            </a>
          </p>
        </Container>
      </Section>

      <FinalCta />
    </>
  );
}
