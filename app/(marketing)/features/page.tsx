import {
  ArrowRight,
  BellRing,
  Briefcase,
  ChartLine,
  FileText,
  Gauge,
  Lightbulb,
  Link2,
  MessageSquareText,
  Radar,
  ScanSearch,
  Sparkles,
  Swords,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/marketing/container";
import { FeatureBlock } from "@/components/marketing/feature-block";
import {
  AgencyVisual,
  AlertsVisual,
  DetectionVisual,
  FreeCheckVisual,
  HistoryVisual,
  PlatformsVisual,
  QuestionsVisual,
  RecommendationVisual,
  ReportsVisual,
  ScoreVisual,
  ShareOfVoiceVisual,
  SourcesVisual,
} from "@/components/marketing/feature-visuals";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import {
  competitorsLabel,
  historyLabel,
  joinNames,
  plansWithFeature,
  SCORE_DISCLAIMER,
  SCORE_NOT_A_RANKING,
  scheduleSummary,
} from "@/components/marketing/plan-copy";
import { marketingMetadata } from "@/components/marketing/seo";
import { PLAN_IDS, PLANS } from "@/lib/billing/plans";
import { formatNumber } from "@/lib/format";
import { QUERY_CATEGORIES } from "@/types/domain";

export const metadata: Metadata = marketingMetadata({
  title: "Features",
  description:
    "AI Visibility Score, ChatGPT, Gemini and Perplexity monitoring, buyer-question generation, competitor share of voice, citation analysis, recommendations, reports and alerts.",
  path: "/features",
});

const firstPlan = PLANS[PLAN_IDS[0]];
const lastPlan = PLANS[PLAN_IDS[PLAN_IDS.length - 1]];
const limitedHistoryPlans = PLAN_IDS.filter((id) => PLANS[id].limits.historyDays !== null).map((id) => PLANS[id]);
const unlimitedHistoryPlans = PLAN_IDS.filter((id) => PLANS[id].limits.historyDays === null).map((id) => PLANS[id].name);
const agency = PLANS.agency;

const FEATURES = [
  {
    id: "score",
    icon: Gauge,
    eyebrow: "Measure",
    title: "AI Visibility Score",
    summary: "One 0–100 number for how visible you are inside AI answers.",
    description:
      "A single score that summarizes how visible your business is across the AI answers you monitor, broken down by platform, question category and competitor.",
    bullets: [
      "Transparent weights for mentions, recommendations, position, citations and sentiment",
      "Separate scores for ChatGPT, Gemini and Perplexity",
      "Change since your previous scan on every metric",
    ],
    note: `${SCORE_NOT_A_RANKING} ${SCORE_DISCLAIMER}`,
    visual: <ScoreVisual />,
  },
  {
    id: "platforms",
    icon: Radar,
    eyebrow: "Monitor",
    title: "ChatGPT, Gemini and Perplexity monitoring",
    summary: "The same questions on every platform, analyzed the same way.",
    description:
      "We ask each AI platform the same buyer questions and analyze every answer with the same method, so results are comparable across platforms and over time.",
    bullets: [
      "Choose which platforms to monitor for each project",
      "Web search or grounding enabled where the platform supports it",
      "The full answer text is stored, so you can read exactly what AI said",
    ],
    note: "Simulated answers are always labeled. If live monitoring isn’t enabled for an account, results come from a clearly marked simulation and are never presented as real AI answers.",
    visual: <PlatformsVisual />,
  },
  {
    id: "questions",
    icon: MessageSquareText,
    eyebrow: "Ask",
    title: "Buyer-question generator",
    summary: `Realistic customer questions across ${QUERY_CATEGORIES.length} categories.`,
    description: `Start with the questions real customers ask. We generate them from your industry, services and location across ${QUERY_CATEGORIES.length} categories, and you stay in full control of the list.`,
    bullets: [
      "Best-of, recommendation, local, comparison, problem-based and purchase-intent questions",
      "Add your own questions, edit, pause or prioritize any of them",
      "Near-duplicate detection keeps your list focused",
    ],
    visual: <QuestionsVisual />,
  },
  {
    id: "detection",
    icon: ScanSearch,
    eyebrow: "Analyze",
    title: "Mention and recommendation detection",
    summary: "Mentioned, recommended, position and sentiment for every answer.",
    description:
      "Every answer is analyzed for whether your business was mentioned, whether it was actually recommended, where it appeared in the list and how it was described.",
    bullets: [
      "List position and sentiment for every mention",
      "Evidence quotes from the answer, so you can verify each result",
      "Other businesses AI named instead of you",
    ],
    visual: <DetectionVisual />,
  },
  {
    id: "competitors",
    icon: Swords,
    eyebrow: "Compare",
    title: "Competitor comparison and share of voice",
    summary: "See which competitors AI recommends, and how often.",
    description:
      "Compare your AI visibility with the competitors you choose. See who gets recommended, for which questions, and what share of all recommendations goes to each business.",
    bullets: [
      `Track ${competitorsLabel(firstPlan)} competitors per project on ${firstPlan.name}, up to ${competitorsLabel(lastPlan).toLowerCase()} on ${lastPlan.name}`,
      "Side-by-side scores, mention rates, recommendation rates and average position",
      "Spot businesses AI recommends that you aren’t tracking yet",
    ],
    visual: <ShareOfVoiceVisual />,
  },
  {
    id: "sources",
    icon: Link2,
    eyebrow: "Understand",
    title: "Citation and source analysis",
    summary: "Which websites AI relies on when it talks about your market.",
    description:
      "See which websites AI answers cite when they discuss your category, which of them mention your competitors, and whether your own website is one of them.",
    bullets: [
      "Most-cited domains across all monitored answers",
      "Sources associated with each competitor",
      "How often your own website is cited",
    ],
    visual: <SourcesVisual />,
  },
  {
    id: "recommendations",
    icon: Lightbulb,
    eyebrow: "Improve",
    title: "Actionable recommendations",
    summary: "Prioritized next steps tied to observed signals.",
    description:
      "Every scan produces a prioritized list of practical improvements, each explained by the signals we observed, from missing comparison pages to weak third-party authority.",
    bullets: [
      "Prioritized by expected impact, with a plain-language reason for each",
      "Covers your website, content, authority, local presence, reviews and citations",
      "Mark items as done and see what changes in the next scans",
    ],
    note: `Advanced recommendations are included on ${plansWithFeature("advancedRecommendations")}.`,
    visual: <RecommendationVisual />,
  },
  {
    id: "history",
    icon: ChartLine,
    eyebrow: "Track",
    title: "History and trend tracking",
    summary: "See whether your visibility is improving over time.",
    description:
      "Every scan is saved, so you can follow your score over time, by platform, and open any past scan to see exactly what changed.",
    bullets: [
      "Score trends overall and per AI platform",
      "Compare any scan with the one before it",
      `History: ${joinNames(limitedHistoryPlans.map((p) => `${historyLabel(p)} on ${p.name}`))}, unlimited on ${joinNames(unlimitedHistoryPlans)}`,
    ],
    visual: <HistoryVisual />,
  },
  {
    id: "reports",
    icon: FileText,
    eyebrow: "Share",
    title: "Reports and weekly email",
    summary: "Shareable reports, print-ready PDFs and a weekly summary.",
    description:
      "Turn any scan into a clear report for your team, your boss or your client, and get a weekly summary of your AI visibility by email.",
    bullets: [
      "A report for every scan, written in plain business language",
      `Print-ready PDF export on ${plansWithFeature("pdfReports")}`,
      "Weekly email reports you can switch off at any time",
    ],
    visual: <ReportsVisual whiteLabelPlans={plansWithFeature("whiteLabelReports")} />,
  },
  {
    id: "alerts",
    icon: BellRing,
    eyebrow: "Stay ahead",
    title: "Alerts for drops and competitor overtakes",
    summary: "Know when visibility drops or a competitor moves ahead.",
    description:
      "We compare every scan with the previous one and let you know when something important changes, so you never find out months later.",
    bullets: [
      "Alerts when your score drops or you disappear from monitored answers",
      "Alerts when a competitor overtakes you",
      "In-app notifications and email, with preferences for each alert type",
    ],
    note: `Scans run on the schedule you choose: ${scheduleSummary()}. You can also run a scan on demand.`,
    visual: <AlertsVisual />,
  },
  {
    id: "free-check",
    icon: Sparkles,
    eyebrow: "Try it",
    title: "Free AI visibility check",
    summary: "A quick snapshot of your AI visibility, no account needed.",
    description:
      "Not ready to sign up? Run a free check to get a snapshot of how AI answers treat your business today, then start monitoring when you want the full picture.",
    bullets: ["No account or credit card required", "A sample of buyer questions for your business", "Start full monitoring whenever you’re ready"],
    visual: <FreeCheckVisual />,
  },
  {
    id: "agencies",
    icon: Briefcase,
    eyebrow: "For agencies",
    title: "Built for agencies and consultants",
    summary: "Monitor many clients and report under your own brand.",
    description:
      "Marketing and SEO agencies, freelancers and consultants can monitor AI visibility for many clients from one account and deliver reports their clients understand.",
    bullets: [
      `Up to ${formatNumber(agency.limits.projects)} client projects and ${formatNumber(agency.limits.queriesPerMonth)} queries per month on ${agency.name}`,
      `White-label reports with your own brand name on ${plansWithFeature("whiteLabelReports")}`,
      "A consistent, explainable metric to report month after month",
    ],
    visual: <AgencyVisual />,
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Features"
        title="See how AI sees your brand."
        description="Everything you need to measure, understand and improve how ChatGPT, Gemini and Perplexity talk about your business."
        actions={
          <>
            <Button asChild size="lg">
              <Link href="/free-ai-visibility-check">
                Check My AI Visibility
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/demo">View Demo</Link>
            </Button>
          </>
        }
      />

      <Container className="py-16 sm:py-20">
        <h2 className="sr-only">All features</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ id, icon: Icon, title, summary }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="group flex h-full gap-3.5 rounded-xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-border-strong"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">{summary}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Container>

      <div className="border-t border-border bg-surface/50">
        <Container>
          {FEATURES.map((f, i) => (
            <FeatureBlock
              key={f.id}
              id={f.id}
              icon={f.icon}
              eyebrow={f.eyebrow}
              title={f.title}
              description={f.description}
              bullets={f.bullets}
              note={f.note}
              visual={f.visual}
              reverse={i % 2 === 1}
            />
          ))}
        </Container>
      </div>

      <FinalCta />
    </>
  );
}
