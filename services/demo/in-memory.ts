import { analyzeHeuristically } from "@/services/ai/analyzer/heuristic";
import { buildMockResponse } from "@/services/ai/providers/mock";
import { computeScanMetrics, type MetricsRunInput } from "@/services/metrics/aggregate";
import { generateQueries } from "@/services/queries/generator";
import { generateRecommendations } from "@/services/recommendations/engine";
import type { BusinessContext, CompetitorContext, Priority, ProviderId, RecommendationCategory, ScanMetrics } from "@/types/domain";

/**
 * Public demo dataset, built entirely in memory (no database, no network).
 *
 * Every AI answer here is SIMULATED by the deterministic mock provider, but it
 * is processed by the real engine: the heuristic analyzer detects mentions,
 * recommendations, positions and citations; the metrics aggregator scores
 * them; the rules engine derives recommendations. The UI must label all of
 * it as demo data.
 *
 * Pure module: it must never import server-only, env or database code, so it
 * can run during static rendering of the public /demo page.
 */

export const DEMO_BUSINESS: BusinessContext = {
  name: "ABC Dental",
  website: "https://abcdental.com",
  domain: "abcdental.com",
  industry: "Dental Clinic",
  businessType: "local",
  city: "Lahore",
  country: "Pakistan",
  services: ["Dental implants", "Braces", "Teeth whitening", "Root canal", "Dental checkups"],
  aliases: [],
  description: "Family and cosmetic dental clinic in Lahore.",
};

/** Fixed ids keep colors, keys and links stable between renders. */
export const DEMO_COMPETITORS: CompetitorContext[] = [
  { id: "00000000-0000-4000-8000-00000000c001", name: "XYZ Dental", domain: "xyzdental.com", aliases: [] },
  { id: "00000000-0000-4000-8000-00000000c002", name: "Smile Clinic", domain: "smileclinic.pk", aliases: [] },
  { id: "00000000-0000-4000-8000-00000000c003", name: "Dental Care Lahore", domain: "dentalcarelahore.com", aliases: [] },
];

export const DEMO_PROVIDERS: ProviderId[] = ["chatgpt", "gemini", "perplexity"];

const QUERY_COUNT = 40;
const DAY_MS = 86_400_000;
/**
 * Simulated visibility bias (mockStrength) per weekly scan: gradual
 * improvement with small dips. The mock provider adds per-platform bias and
 * per-answer noise on top, so these inputs take the overall score from about
 * 26 to 46: improving, but still about 9 points behind the strongest
 * competitor, with open recommendations — a realistic story for the demo.
 * (Inputs around 0.40 → 0.64 would put the sample business far ahead of every
 * competitor, which leaves nothing to explain on the competitor views.)
 */
const STRENGTHS = [0.3, 0.33, 0.32, 0.36, 0.39, 0.42, 0.42, 0.47];
const SCAN_COUNT = STRENGTHS.length;

export interface DemoHistoryPoint {
  date: string;
  score: number;
  chatgpt: number | null;
  gemini: number | null;
  perplexity: number | null;
}

export interface DemoRecommendation {
  id: string;
  title: string;
  reason: string;
  priority: Priority;
  category: RecommendationCategory;
}

export interface DemoDataset {
  business: BusinessContext;
  competitors: CompetitorContext[];
  providers: ProviderId[];
  latest: { metrics: ScanMetrics; completedAt: string };
  previous: { metrics: ScanMetrics; completedAt: string } | null;
  history: DemoHistoryPoint[];
  recommendations: DemoRecommendation[];
  totalRecommendations: number;
  questionCount: number;
}

interface DemoQuery {
  id: string;
  text: string;
  category: MetricsRunInput["category"];
  priority: Priority;
  service: string | null;
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function demoQueries(): DemoQuery[] {
  return generateQueries({
    business: DEMO_BUSINESS,
    competitors: DEMO_COMPETITORS.map((c) => c.name),
    count: QUERY_COUNT,
  }).map((q, i) => ({
    id: `00000000-0000-4000-8000-${(i + 1).toString(16).padStart(12, "0")}`,
    text: q.text,
    category: q.category,
    priority: q.priority,
    service: q.service,
  }));
}

/** Run one simulated weekly scan through the real analysis + scoring engine. */
function simulateScan(queries: DemoQuery[], scanIndex: number): ScanMetrics {
  const analyzerCompetitors = DEMO_COMPETITORS.map((c) => ({ id: c.id, name: c.name, aliases: c.aliases, domain: c.domain }));
  const runs: MetricsRunInput[] = [];
  for (const q of queries) {
    for (const provider of DEMO_PROVIDERS) {
      const response = buildMockResponse(provider, {
        query: q.text,
        businessContext: DEMO_BUSINESS,
        competitors: DEMO_COMPETITORS,
        seed: `demo-scan-${scanIndex}`,
        mockStrength: STRENGTHS[scanIndex],
      });
      const analysis = analyzeHeuristically({
        response: response.text,
        citations: response.citations,
        business: { name: DEMO_BUSINESS.name, aliases: DEMO_BUSINESS.aliases, domain: DEMO_BUSINESS.domain },
        competitors: analyzerCompetitors,
      });
      runs.push({
        provider,
        status: "completed",
        queryId: q.id,
        queryText: q.text,
        category: q.category,
        priority: q.priority,
        service: q.service,
        citations: response.citations,
        analysis: {
          mentioned: analysis.mentioned,
          recommended: analysis.recommended,
          position: analysis.position,
          sentiment: analysis.sentiment,
          citation: analysis.citation,
          competitors: analysis.competitors,
          otherBusinesses: analysis.otherBusinesses,
        },
      });
    }
  }
  return computeScanMetrics({
    providers: DEMO_PROVIDERS,
    runs,
    competitors: DEMO_COMPETITORS.map((c) => ({ id: c.id, name: c.name, domain: c.domain ?? null })),
    businessDomain: DEMO_BUSINESS.domain ?? null,
  });
}

function providerScore(metrics: ScanMetrics, id: ProviderId): number | null {
  const p = metrics.providers.find((x) => x.provider === id);
  return p && p.status !== "unavailable" ? p.score : null;
}

function buildDataset(now: number): DemoDataset {
  const queries = demoQueries();
  // Weekly scans ending yesterday (UTC midnight-aligned so dates are stable within a day).
  const anchor = Math.floor(now / DAY_MS) * DAY_MS - DAY_MS + 9 * 3_600_000;
  const scans = STRENGTHS.map((_, i) => ({
    completedAt: new Date(anchor - (SCAN_COUNT - 1 - i) * 7 * DAY_MS).toISOString(),
    metrics: simulateScan(queries, i),
  }));

  const latest = scans[scans.length - 1];
  const previous = scans.length > 1 ? scans[scans.length - 2] : null;

  const drafts = generateRecommendations({ business: DEMO_BUSINESS, metrics: latest.metrics })
    .map((d, index) => ({ d, index }))
    .sort((a, b) => PRIORITY_RANK[a.d.priority] - PRIORITY_RANK[b.d.priority] || a.index - b.index)
    .map(({ d }) => d);

  return {
    business: DEMO_BUSINESS,
    competitors: DEMO_COMPETITORS,
    providers: DEMO_PROVIDERS,
    latest,
    previous,
    history: scans.map((s) => ({
      date: s.completedAt,
      score: s.metrics.overall.score,
      chatgpt: providerScore(s.metrics, "chatgpt"),
      gemini: providerScore(s.metrics, "gemini"),
      perplexity: providerScore(s.metrics, "perplexity"),
    })),
    recommendations: drafts.slice(0, 3).map((d) => ({
      id: d.key,
      title: d.title,
      reason: d.reason,
      priority: d.priority,
      category: d.category,
    })),
    totalRecommendations: drafts.length,
    questionCount: queries.length,
  };
}

let cached: { day: number; data: DemoDataset } | null = null;

/**
 * The demo dataset, computed once per process per UTC day (dates are relative
 * to "now", everything else is deterministic).
 */
export function getDemoDataset(now = Date.now()): DemoDataset {
  const day = Math.floor(now / DAY_MS);
  if (!cached || cached.day !== day) cached = { day, data: buildDataset(now) };
  return cached.data;
}
