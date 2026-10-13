import { BadgePercent, CalendarClock, CreditCard } from "lucide-react";
import type { Metadata } from "next";

import { PricingTable } from "@/components/billing/pricing-table";
import { Container, Section, SectionHeading } from "@/components/marketing/container";
import { PRICING_FAQ } from "@/components/marketing/faq-data";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { JsonLd } from "@/components/marketing/json-ld";
import { PageIntro } from "@/components/marketing/page-intro";
import { annualDiscountPercent } from "@/components/marketing/plan-copy";
import { PlanComparison } from "@/components/marketing/plan-comparison";
import { marketingMetadata } from "@/components/marketing/seo";
import { faqPageNode, jsonLdGraph, organizationNode, softwareApplicationNode } from "@/components/marketing/structured-data";
import { PLAN_IDS, PLANS, TRIAL_DAYS } from "@/lib/billing/plans";

const cheapest = Math.min(...PLAN_IDS.map((id) => PLANS[id].monthlyPrice));

export const metadata: Metadata = marketingMetadata({
  title: "Pricing",
  description: `Plans for monitoring your AI search visibility from $${cheapest}/month. ${TRIAL_DAYS}-day free trial, no credit card required. Save ${annualDiscountPercent}% with annual billing.`,
  path: "/pricing",
});

const NOTES = [
  {
    icon: CalendarClock,
    title: `${TRIAL_DAYS}-day free trial`,
    body: "Try any plan with full monitoring. No credit card required to start.",
  },
  {
    icon: BadgePercent,
    title: `Save ${annualDiscountPercent}% annually`,
    body: "Switch to annual billing for the same features at a lower monthly price.",
  },
  {
    icon: CreditCard,
    title: "Cancel anytime",
    body: "No contracts. Your plan stays active until the end of the paid period.",
  },
];

export default function PricingPage() {
  return (
    <>
      <JsonLd data={jsonLdGraph(organizationNode(), softwareApplicationNode(), faqPageNode(PRICING_FAQ, "/pricing"))} />
      <PageIntro
        eyebrow="Pricing"
        title="Simple pricing for AI search visibility."
        description={`Start with a ${TRIAL_DAYS}-day free trial on any plan. No credit card required, and you can cancel anytime.`}
      />

      <Container className="py-16 sm:py-20">
        <h2 className="sr-only">Plans</h2>
        <PricingTable mode="marketing" />
        <ul className="mt-12 grid gap-4 sm:grid-cols-3">
          {NOTES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>

      <Section tone="muted" aria-labelledby="compare-title" className="sm:py-24">
        <Container>
          <SectionHeading
            id="compare-title"
            title="Compare plans"
            description="Every plan includes monitoring on ChatGPT, Gemini and Perplexity, the AI Visibility Score, competitor comparison and recommendations. Higher plans add capacity, history and reporting."
          />
          <div className="mt-10">
            <PlanComparison />
          </div>
        </Container>
      </Section>

      <FaqSection
        items={PRICING_FAQ}
        title="Pricing questions"
        description="How plans, queries, trials and billing work."
      />
      <FinalCta />
    </>
  );
}
