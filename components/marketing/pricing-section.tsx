import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PricingTable } from "@/components/billing/pricing-table";
import { TRIAL_DAYS } from "@/lib/billing/plans";

import { Container, Section, SectionHeading } from "./container";

export function PricingSection() {
  return (
    <Section tone="muted" aria-labelledby="pricing-title" id="pricing">
      <Container>
        <SectionHeading
          id="pricing-title"
          eyebrow="Pricing"
          title="Simple plans that grow with you."
          description={`Start with a ${TRIAL_DAYS}-day free trial on any plan. No credit card required, cancel anytime.`}
          align="center"
        />
        <div className="mt-12">
          <PricingTable mode="marketing" />
        </div>
        <p className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Compare every plan feature
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </p>
      </Container>
    </Section>
  );
}
