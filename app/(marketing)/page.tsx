import type { Metadata } from "next";

import { CompetitorSection } from "@/components/marketing/competitor-section";
import { LANDING_FAQ } from "@/components/marketing/faq-data";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { JsonLd } from "@/components/marketing/json-ld";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { RecommendationsSection } from "@/components/marketing/recommendations-section";
import { ScoreSection } from "@/components/marketing/score-section";
import { marketingMetadata } from "@/components/marketing/seo";
import {
  faqPageNode,
  jsonLdGraph,
  organizationNode,
  softwareApplicationNode,
} from "@/components/marketing/structured-data";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = marketingMetadata({
  title: `${siteConfig.name}: Does AI recommend your business?`,
  absoluteTitle: true,
  description:
    "See how ChatGPT, Gemini and Perplexity mention your business when customers ask for recommendations. Track your AI search visibility, compare competitors and get clear next steps.",
  path: "/",
});

export default function LandingPage() {
  return (
    <>
      <JsonLd data={jsonLdGraph(organizationNode(), softwareApplicationNode(), faqPageNode(LANDING_FAQ, "/"))} />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <ScoreSection />
      <CompetitorSection />
      <RecommendationsSection />
      <PricingSection />
      <FaqSection items={LANDING_FAQ} />
      <FinalCta />
    </>
  );
}
