import { describe, expect, it } from "vitest";

import { generateRecommendations } from "@/services/recommendations/engine";
import { fixtureMetrics } from "@/tests/fixtures/metrics";
import type { BusinessContext, ScanMetrics } from "@/types/domain";

const business: BusinessContext = {
  name: "ABC Dental",
  domain: "abcdental.com",
  industry: "Dental Clinic",
  businessType: "local",
  city: "Lahore",
  country: "Pakistan",
  services: ["Dental implants", "Braces"],
};

const PRIORITY = { high: 0, medium: 1, low: 2 } as const;

function withOverall(m: ScanMetrics, overrides: Partial<ScanMetrics["overall"]>): ScanMetrics {
  return { ...m, overall: { ...m.overall, ...overrides } };
}

describe("recommendation engine", () => {
  it("returns nothing when no runs succeeded", () => {
    expect(generateRecommendations({ business, metrics: { ...fixtureMetrics(), runsSucceeded: 0 } })).toEqual([]);
  });

  it("produces complete, specific recommendations sorted by priority", () => {
    const recs = generateRecommendations({ business, metrics: fixtureMetrics() });
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r.title).toBeTruthy();
      expect(r.description).toBeTruthy();
      expect(r.reason).toMatch(/\d/); // evidence-backed numbers
      expect(r.action.length).toBeGreaterThan(40);
      expect(["website", "content", "authority", "local_seo", "brand", "reviews", "citations", "services"]).toContain(r.category);
      expect(r.action).not.toMatch(/guarantee/i);
    }
    for (let i = 1; i < recs.length; i++) expect(PRIORITY[recs[i - 1].priority]).toBeLessThanOrEqual(PRIORITY[recs[i].priority]);
    expect(new Set(recs.map((r) => r.key)).size).toBe(recs.length);
  });

  it("flags a missing AI footprint as high priority", () => {
    const m = withOverall(fixtureMetrics(), { mentionRate: 5, mentions: 1, recommendations: 0 });
    const rec = generateRecommendations({ business, metrics: m }).find((r) => r.key === "baseline-footprint");
    expect(rec?.priority).toBe("high");
    expect(rec?.action).toContain("Lahore");
  });

  it("raises negative-sentiment recommendations", () => {
    const m = withOverall(fixtureMetrics(), { mentions: 4, sentiment: { positive: 1, neutral: 1, negative: 2 } });
    const rec = generateRecommendations({ business, metrics: m }).find((r) => r.key === "negative-sentiment");
    expect(rec).toMatchObject({ priority: "high", category: "reviews" });
  });

  it("keeps keys stable across runs (so user status is preserved)", () => {
    const a = generateRecommendations({ business, metrics: fixtureMetrics() }).map((r) => r.key);
    const b = generateRecommendations({ business, metrics: fixtureMetrics() }).map((r) => r.key);
    expect(a).toEqual(b);
  });
});
