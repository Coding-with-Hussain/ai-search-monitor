import { describe, expect, it } from "vitest";

import { analyzeHeuristically } from "@/services/ai/analyzer/heuristic";
import { buildMockResponse, defaultMockStrength, MockProvider } from "@/services/ai/providers/mock";
import type { BusinessContext } from "@/types/domain";

const business: BusinessContext = {
  name: "ABC Dental",
  domain: "abcdental.com",
  industry: "Dental Clinic",
  businessType: "local",
  city: "Lahore",
  country: "Pakistan",
  services: ["Braces"],
};
const competitors = [
  { id: "1", name: "XYZ Dental", domain: "xyzdental.com" },
  { id: "2", name: "Smile Clinic", domain: "smileclinic.pk" },
];

describe("simulation provider", () => {
  it("is deterministic for the same seed and varies with the seed", () => {
    const input = { query: "Best dentist in Lahore?", businessContext: business, competitors, seed: "scan-1" };
    expect(buildMockResponse("chatgpt", input)).toEqual(buildMockResponse("chatgpt", input));
    const other = buildMockResponse("chatgpt", { ...input, seed: "scan-2" });
    const many = ["a", "b", "c", "d", "e"].map((seed) => buildMockResponse("chatgpt", { ...input, seed }).text);
    expect(new Set([...many, other.text]).size).toBeGreaterThan(1);
  });

  it("labels results as simulated with zero cost", async () => {
    const r = await new MockProvider("perplexity").runQuery({ query: "Best dentist in Lahore?", businessContext: business, competitors, seed: "x" });
    expect(r.isMock).toBe(true);
    expect(r.estimatedCostUsd).toBe(0);
    expect(r.model).toBe("simulated-perplexity");
    expect(r.citations.length).toBeGreaterThan(0); // perplexity always cites
  });

  it("produces answers the analyzer can parse", () => {
    let mentioned = 0;
    for (let i = 0; i < 30; i++) {
      const { text, citations } = buildMockResponse("chatgpt", { query: `Best dental clinic in Lahore #${i}?`, businessContext: business, competitors, seed: "s" });
      const a = analyzeHeuristically({ response: text, citations, business, competitors: competitors.map((c) => ({ ...c })) });
      if (a.mentioned) {
        mentioned++;
        expect(a.position).not.toBeNull();
      }
    }
    expect(mentioned).toBeGreaterThan(5);
    expect(mentioned).toBeLessThan(30);
  });

  it("higher strength means more visibility", () => {
    const visibility = (strength: number) =>
      Array.from({ length: 40 }, (_, i) =>
        analyzeHeuristically({
          ...(() => {
            const r = buildMockResponse("gemini", { query: `q${i}`, businessContext: business, competitors, seed: "s", mockStrength: strength });
            return { response: r.text, citations: r.citations };
          })(),
          business,
          competitors: competitors.map((c) => ({ ...c })),
        }),
      ).filter((a) => a.mentioned).length;
    expect(visibility(0.85)).toBeGreaterThan(visibility(0.2));
  });

  it("always mentions a business named in the question", () => {
    const { text } = buildMockResponse("gemini", { query: "ABC Dental vs XYZ Dental: which is better?", businessContext: business, competitors, seed: "z", mockStrength: 0.05 });
    expect(text).toContain("ABC Dental");
  });

  it("derives a stable default strength in a sane range", () => {
    const s = defaultMockStrength(business);
    expect(s).toBe(defaultMockStrength(business));
    expect(s).toBeGreaterThan(0.3);
    expect(s).toBeLessThan(0.8);
  });
});
