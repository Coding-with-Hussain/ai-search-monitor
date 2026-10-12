import { describe, expect, it } from "vitest";

import { competitorInsight, strongestCompetitor } from "@/services/metrics/competitor-insights";
import { scoreResult } from "@/services/scoring";
import { fixtureMetrics, fixtureRuns } from "@/tests/fixtures/metrics";

describe("scan metrics aggregation", () => {
  const m = fixtureMetrics();

  it("counts runs and computes overall rates", () => {
    expect(m.runsTotal).toBe(12);
    expect(m.runsSucceeded).toBe(12);
    expect(m.runsFailed).toBe(0);
    expect(m.overall.mentionRate).toBe(75); // mentioned in 3 of 4 fixtures
    expect(m.overall.recommendationRate).toBe(50);
    expect(m.overall.averagePosition).toBe(2.5); // positions 2 and 3
  });

  it("overall score equals the mean of per-run scores", () => {
    const runs = fixtureRuns().filter((r) => r.analysis);
    const mean = runs.reduce((s, r) => s + scoreResult(r.analysis!), 0) / runs.length;
    expect(m.overall.score).toBeCloseTo(Math.round(mean * 10) / 10, 5);
  });

  it("computes per-provider metrics", () => {
    expect(m.providers).toHaveLength(3);
    for (const p of m.providers) {
      expect(p.status).toBe("ok");
      expect(p.queriesAnalyzed).toBe(4);
      expect(p.score).toBe(m.overall.score);
    }
  });

  it("share of voice slices sum to ~100%", () => {
    const total = m.shareOfVoice.reduce((s, x) => s + x.share, 0);
    expect(total).toBeGreaterThan(99);
    expect(total).toBeLessThan(101);
    expect(m.shareOfVoice[0]).toMatchObject({ kind: "business", name: "Your business" });
  });

  it("computes competitor metrics and the competitor gap", () => {
    const xyz = m.competitors.find((c) => c.name === "XYZ Dental")!;
    expect(xyz.metrics.mentionRate).toBe(75);
    expect(m.competitorGap).not.toBeNull();
    const strongest = strongestCompetitor(m)!;
    expect(m.competitorGap!.competitorName).toBe(strongest.name);
    expect(m.competitorGap!.points).toBeCloseTo(m.overall.score - strongest.metrics.score, 1);
  });

  it("aggregates categories, services, sources and per-query summaries", () => {
    expect(m.categories.map((c) => c.key).sort()).toEqual(["best_of", "product_service", "purchase_intent", "recommendation"]);
    const braces = m.services.find((s) => s.label === "Braces")!;
    expect(braces.queries).toBe(2);
    expect(m.topSources.find((s) => s.domain === "abcdental.com")?.isOwnDomain).toBe(true);
    expect(m.topSources.find((s) => s.domain === "xyzdental.com")?.competitorName).toBe("XYZ Dental");
    expect(m.queries).toHaveLength(4);
    const q0 = m.queries.find((q) => q.queryId === "q0")!;
    expect(q0.mentionedIn).toBe(3);
    expect(q0.bestPosition).toBe(2);
    expect(Object.keys(q0.providers).sort()).toEqual(["chatgpt", "gemini", "perplexity"]);
  });

  it("marks unavailable providers without failing the scan", () => {
    const partial = fixtureMetrics({ failProvider: "gemini" });
    expect(partial.runsFailed).toBe(4);
    expect(partial.runsSucceeded).toBe(8);
    expect(partial.unavailableProviders).toEqual(["gemini"]);
    expect(partial.providers.find((p) => p.provider === "gemini")?.status).toBe("unavailable");
  });

  it("explains why a competitor is winning with observed signals", () => {
    const insight = competitorInsight(m, "c-xyz")!;
    expect(insight.competitor.name).toBe("XYZ Dental");
    expect(Array.isArray(insight.signals)).toBe(true);
    for (const s of insight.signals) {
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.detail.length).toBeGreaterThan(10);
    }
    expect(competitorInsight(m, "missing")).toBeNull();
  });
});
