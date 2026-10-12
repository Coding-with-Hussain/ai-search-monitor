import { analyzeHeuristically } from "@/services/ai/analyzer/heuristic";
import { computeScanMetrics, type MetricsRunInput } from "@/services/metrics/aggregate";
import type { ProviderId } from "@/types/domain";

import { BUSINESS, COMPETITORS, NEGATIVE_MENTION, NOT_MENTIONED, NUMBERED_LIST, PROSE_RECOMMENDATION } from "./responses";

const FIXTURES = [
  { f: PROSE_RECOMMENDATION, category: "best_of" as const, service: null },
  { f: NUMBERED_LIST, category: "product_service" as const, service: "Braces" },
  { f: NOT_MENTIONED, category: "purchase_intent" as const, service: null },
  { f: NEGATIVE_MENTION, category: "recommendation" as const, service: "Braces" },
];

/** Build metrics input: every fixture answered by every provider, optionally with failures. */
export function fixtureRuns(options: { failProvider?: ProviderId } = {}): MetricsRunInput[] {
  const providers: ProviderId[] = ["chatgpt", "gemini", "perplexity"];
  return providers.flatMap((provider) =>
    FIXTURES.map(({ f, category, service }, i) => {
      if (provider === options.failProvider) {
        return { provider, status: "unavailable" as const, queryId: `q${i}`, queryText: f.query, category, priority: "high" as const, service, citations: [], analysis: null };
      }
      const a = analyzeHeuristically({ response: f.response, citations: f.citations, business: BUSINESS, competitors: COMPETITORS });
      return {
        provider,
        status: "completed" as const,
        queryId: `q${i}`,
        queryText: f.query,
        category,
        priority: i === 0 ? ("high" as const) : ("medium" as const),
        service,
        citations: f.citations,
        analysis: a,
      };
    }),
  );
}

export function fixtureMetrics(options: { failProvider?: ProviderId } = {}) {
  return computeScanMetrics({
    providers: ["chatgpt", "gemini", "perplexity"],
    runs: fixtureRuns(options),
    competitors: COMPETITORS.map((c) => ({ id: c.id, name: c.name, domain: c.domain })),
    businessDomain: BUSINESS.domain,
  });
}
