import { domainMatches } from "@/lib/domain";
import { aggregateSignals, type ResultSignals, SCORING_VERSION, scoreResult } from "@/services/scoring";
import type {
  AnalysisCompetitorResult,
  Citation,
  CompetitorMetrics,
  OtherBusiness,
  Priority,
  ProviderId,
  ProviderMetrics,
  QueryCategory,
  QuerySummary,
  ScanMetrics,
  SegmentMetrics,
  Sentiment,
  ShareOfVoiceSlice,
  SourceDomainStat,
} from "@/types/domain";

/**
 * Pure aggregation of analyzed runs into the dashboard metrics snapshot.
 * No I/O — easy to unit test and to re-run when the scoring model changes.
 */

export interface MetricsRunInput {
  provider: ProviderId;
  status: "completed" | "failed" | "unavailable" | "pending" | "running";
  queryId: string | null;
  queryText: string;
  category: QueryCategory;
  priority: Priority;
  service: string | null;
  citations: Citation[];
  analysis: {
    mentioned: boolean;
    recommended: boolean;
    position: number | null;
    sentiment: Sentiment | null;
    citation: boolean;
    competitors: AnalysisCompetitorResult[];
    otherBusinesses: OtherBusiness[];
  } | null;
}

export interface MetricsInput {
  providers: ProviderId[];
  runs: MetricsRunInput[];
  competitors: Array<{ id: string; name: string; domain: string | null }>;
  businessDomain: string | null;
}

export const CATEGORY_LABELS: Record<QueryCategory, string> = {
  best_of: "Best-of",
  recommendation: "Recommendation",
  local: "Local",
  comparison: "Comparison",
  product_service: "Product / service",
  problem_based: "Problem-based",
  purchase_intent: "Purchase intent",
  brand_comparison: "Brand comparison",
};

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

type Analyzed = MetricsRunInput & { analysis: NonNullable<MetricsRunInput["analysis"]> };

function competitorSignals(run: Analyzed, competitorId: string): ResultSignals {
  const c = run.analysis.competitors.find((x) => x.competitorId === competitorId);
  if (!c) return { mentioned: false, recommended: false, position: null, sentiment: null, citation: false };
  return { mentioned: c.mentioned, recommended: c.recommended, position: c.position, sentiment: c.sentiment, citation: c.cited };
}

function businessSignals(run: Analyzed): ResultSignals {
  const a = run.analysis;
  return { mentioned: a.mentioned, recommended: a.recommended, position: a.position, sentiment: a.sentiment, citation: a.citation };
}

function segment(
  key: string,
  label: string,
  runs: Analyzed[],
  competitors: MetricsInput["competitors"],
): SegmentMetrics {
  const m = aggregateSignals(runs.map(businessSignals));
  let best: SegmentMetrics["bestCompetitor"] = null;
  for (const c of competitors) {
    const cm = aggregateSignals(runs.map((r) => competitorSignals(r, c.id)));
    if (!best || cm.mentionRate > best.mentionRate) best = { name: c.name, mentionRate: cm.mentionRate };
  }
  const queries = new Set(runs.map((r) => r.queryId ?? r.queryText)).size;
  return { key, label, queries, runs: runs.length, score: m.score, mentionRate: m.mentionRate, bestCompetitor: best };
}

export function computeScanMetrics(input: MetricsInput): ScanMetrics {
  const analyzed = input.runs.filter((r): r is Analyzed => r.status === "completed" && r.analysis !== null);
  const failedRuns = input.runs.filter((r) => r.status === "failed" || r.status === "unavailable");

  // --- Overall & providers ---------------------------------------------------
  const overall = aggregateSignals(analyzed.map(businessSignals));

  const providers: ProviderMetrics[] = input.providers.map((provider) => {
    const pr = analyzed.filter((r) => r.provider === provider);
    const failed = input.runs.filter((r) => r.provider === provider && (r.status === "failed" || r.status === "unavailable"));
    const m = aggregateSignals(pr.map(businessSignals));
    return {
      ...m,
      provider,
      status: pr.length === 0 ? "unavailable" : failed.length > 0 ? "partial" : "ok",
      queriesAnalyzed: new Set(pr.map((r) => r.queryId ?? r.queryText)).size,
      failedRuns: failed.length,
    };
  });

  // --- Competitors --------------------------------------------------------------
  const competitors: CompetitorMetrics[] = input.competitors.map((c) => ({
    competitorId: c.id,
    name: c.name,
    domain: c.domain,
    metrics: aggregateSignals(analyzed.map((r) => competitorSignals(r, c.id))),
  }));

  // --- Share of voice (recommendations across all businesses) -----------------
  let othersRecommendations = 0;
  for (const r of analyzed) othersRecommendations += r.analysis.otherBusinesses.length;
  const totalRecommendations =
    overall.recommendations + competitors.reduce((s, c) => s + c.metrics.recommendations, 0) + othersRecommendations;

  const share = (n: number) => pct(n, totalRecommendations);
  overall.shareOfVoice = share(overall.recommendations);
  for (const c of competitors) c.metrics.shareOfVoice = share(c.metrics.recommendations);
  for (const p of providers) {
    const pr = analyzed.filter((r) => r.provider === p.provider);
    const total = pr.reduce(
      (s, r) =>
        s +
        (r.analysis.recommended ? 1 : 0) +
        r.analysis.competitors.filter((c) => c.recommended).length +
        r.analysis.otherBusinesses.length,
      0,
    );
    p.shareOfVoice = pct(p.recommendations, total);
  }

  const shareOfVoice: ShareOfVoiceSlice[] = [
    { key: "business", name: "Your business", kind: "business", mentions: overall.recommendations, share: overall.shareOfVoice },
    ...competitors.map((c) => ({
      key: c.competitorId,
      name: c.name,
      kind: "competitor" as const,
      mentions: c.metrics.recommendations,
      share: c.metrics.shareOfVoice,
    })),
    { key: "others", name: "Others", kind: "others", mentions: othersRecommendations, share: share(othersRecommendations) },
  ];

  // --- Segments ---------------------------------------------------------------------
  const byCategory = new Map<QueryCategory, Analyzed[]>();
  for (const r of analyzed) byCategory.set(r.category, [...(byCategory.get(r.category) ?? []), r]);
  const categories = [...byCategory.entries()].map(([key, runs]) =>
    segment(key, CATEGORY_LABELS[key], runs, input.competitors),
  );

  const byService = new Map<string, Analyzed[]>();
  for (const r of analyzed) {
    if (!r.service) continue;
    const k = r.service.trim();
    byService.set(k, [...(byService.get(k) ?? []), r]);
  }
  const services = [...byService.entries()].map(([key, runs]) => segment(key.toLowerCase(), key, runs, input.competitors));

  // --- Sources ------------------------------------------------------------------------
  const runsWithResponses = input.runs.filter((r) => r.status === "completed");
  const domainCounts = new Map<string, number>();
  for (const r of runsWithResponses) {
    for (const d of new Set(r.citations.map((c) => c.domain.toLowerCase()))) {
      domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
    }
  }
  const topSources: SourceDomainStat[] = [...domainCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([domain, count]) => ({
      domain,
      count,
      share: pct(count, runsWithResponses.length),
      isOwnDomain: domainMatches(domain, input.businessDomain),
      competitorName: input.competitors.find((c) => domainMatches(domain, c.domain))?.name ?? null,
    }));

  // --- Per-query summaries ----------------------------------------------------------------
  const byQuery = new Map<string, Analyzed[]>();
  for (const r of analyzed) {
    const k = r.queryId ?? r.queryText;
    byQuery.set(k, [...(byQuery.get(k) ?? []), r]);
  }
  const queries: QuerySummary[] = [...byQuery.values()].map((runs) => {
    const first = runs[0];
    const providersMap: QuerySummary["providers"] = {};
    for (const r of runs) {
      providersMap[r.provider] = {
        mentioned: r.analysis.mentioned,
        recommended: r.analysis.recommended,
        position: r.analysis.position,
        score: scoreResult(businessSignals(r)),
      };
    }
    const positions = runs.filter((r) => r.analysis.recommended && r.analysis.position).map((r) => r.analysis.position as number);
    const m = aggregateSignals(runs.map(businessSignals));
    return {
      queryId: first.queryId,
      text: first.queryText,
      category: first.category,
      priority: first.priority,
      score: m.score,
      mentionedIn: m.mentions,
      recommendedIn: m.recommendations,
      bestPosition: positions.length ? Math.min(...positions) : null,
      runs: runs.length,
      providers: providersMap,
    };
  });

  // --- Competitor gap ------------------------------------------------------------------------
  const strongest = [...competitors].sort((a, b) => b.metrics.score - a.metrics.score)[0];
  const competitorGap = strongest
    ? { points: Math.round((overall.score - strongest.metrics.score) * 10) / 10, competitorName: strongest.name }
    : null;

  return {
    version: 1,
    scoringVersion: SCORING_VERSION,
    overall,
    providers,
    competitors,
    shareOfVoice,
    categories,
    services,
    topSources,
    queries,
    competitorGap,
    runsTotal: input.runs.length,
    runsSucceeded: analyzed.length,
    runsFailed: failedRuns.length,
    unavailableProviders: providers.filter((p) => p.status === "unavailable").map((p) => p.provider),
  };
}
