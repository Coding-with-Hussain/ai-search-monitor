import type { Metadata } from "next";

import { DemoBanner, DemoBusinessSummary, DemoClosingCta, DemoIntro } from "@/components/overview/demo-intro";
import { ProjectOverview } from "@/components/overview/project-overview";
import type { ProjectOverviewData } from "@/components/overview/types";
import { getDemoDataset } from "@/services/demo/in-memory";

const TITLE = "Live demo";
const DESCRIPTION =
  "Explore a sample AI search visibility dashboard: AI Visibility Score, ChatGPT, Gemini and Perplexity results, competitor share of voice, cited sources and recommendations, built from simulated AI answers.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/demo" },
  openGraph: {
    type: "website",
    url: "/demo",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/twitter-image", width: 1200, height: 630 }],
  },
};

/**
 * Static page: the dataset is computed in memory (no database, no AI calls)
 * and re-generated daily so the scan dates stay recent.
 */
export const revalidate = 86400;

export default function DemoPage() {
  const demo = getDemoDataset();

  const data: ProjectOverviewData = {
    mode: "demo",
    projectId: null,
    businessName: demo.business.name,
    metrics: demo.latest.metrics,
    previous: demo.previous?.metrics ?? null,
    scannedAt: demo.latest.completedAt,
    history: demo.history,
    historyIncludesSimulation: true,
    historyDays: null,
    monitoredProviders: demo.providers,
    competitorOrder: demo.competitors.map((c) => c.id),
    recommendations: demo.recommendations,
    recommendationCount: demo.totalRecommendations,
    isSimulation: true,
    isDemoData: true,
    unavailableReasons: {},
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <DemoIntro businessName={demo.business.name} weeks={demo.history.length} />

      <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:gap-6">
        <DemoBanner />
        <DemoBusinessSummary
          business={demo.business}
          providers={demo.providers}
          questionCount={demo.questionCount}
          scannedAt={demo.latest.completedAt}
        />
        <ProjectOverview data={data} />
      </div>

      <div className="mt-12 sm:mt-16">
        <DemoClosingCta />
      </div>
    </div>
  );
}
