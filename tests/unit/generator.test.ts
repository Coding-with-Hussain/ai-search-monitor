import { describe, expect, it } from "vitest";

import { generateQueries, isNearDuplicate, normalizeQueryText, pluralize, similarity } from "@/services/queries/generator";
import type { BusinessContext } from "@/types/domain";

const dental: BusinessContext = {
  name: "ABC Dental",
  industry: "Dental Clinic",
  businessType: "local",
  city: "Lahore",
  country: "Pakistan",
  services: ["Dental implants", "Braces", "Teeth whitening", "Root canal"],
};

describe("query generator", () => {
  it("generates the requested number of unique questions", () => {
    const qs = generateQueries({ business: dental, competitors: ["XYZ Dental", "Smile Clinic"], count: 30 });
    expect(qs).toHaveLength(30);
    const normalized = qs.map((q) => normalizeQueryText(q.text));
    expect(new Set(normalized).size).toBe(30);
  });

  it("contains no near-duplicates", () => {
    const qs = generateQueries({ business: dental, competitors: ["XYZ Dental"], count: 30 });
    qs.forEach((q, i) => {
      expect(isNearDuplicate(q.text, qs.slice(0, i).map((x) => x.text))).toBe(false);
    });
  });

  it("covers several categories and mentions the city", () => {
    const qs = generateQueries({ business: dental, competitors: ["XYZ Dental"], count: 20 });
    const categories = new Set(qs.map((q) => q.category));
    expect(categories.size).toBeGreaterThanOrEqual(6);
    expect(qs.filter((q) => q.text.includes("Lahore")).length).toBeGreaterThan(10);
    expect(qs.some((q) => q.category === "best_of" && q.priority === "high")).toBe(true);
  });

  it("is deterministic for the same business", () => {
    const a = generateQueries({ business: dental, competitors: [], count: 15 });
    const b = generateQueries({ business: dental, competitors: [], count: 15 });
    expect(a).toEqual(b);
  });

  it("skips existing questions", () => {
    const first = generateQueries({ business: dental, competitors: [], count: 10 });
    const more = generateQueries({ business: dental, competitors: [], count: 10, existing: first.map((q) => q.text) });
    for (const q of more) expect(isNearDuplicate(q.text, first.map((x) => x.text))).toBe(false);
  });

  it("produces SaaS-style questions for software businesses", () => {
    const qs = generateQueries({
      business: { name: "PipeFlow", industry: "CRM software", businessType: "saas", services: ["sales pipeline management"] },
      competitors: ["HubSpot"],
      count: 12,
    });
    expect(qs.some((q) => /best crm software for small businesses/i.test(q.text))).toBe(true);
    expect(qs.some((q) => q.category === "brand_comparison")).toBe(true);
    expect(qs.every((q) => !q.text.includes("{"))).toBe(true);
  });

  it("does not emit city templates for local businesses without a city", () => {
    const qs = generateQueries({ business: { ...dental, city: null }, competitors: [], count: 20 });
    expect(qs.every((q) => !/ in \?| in ,/.test(q.text))).toBe(true);
  });

  it("returns fewer questions when the template space is exhausted", () => {
    const qs = generateQueries({ business: { ...dental, services: [] }, competitors: [], count: 100 });
    expect(qs.length).toBeLessThan(100);
    expect(qs.length).toBeGreaterThan(5);
  });

  it("pluralizes industry nouns", () => {
    expect(pluralize("dental clinic")).toBe("dental clinics");
    expect(pluralize("agency")).toBe("agencies");
    expect(pluralize("coach")).toBe("coaches");
  });

  it("measures similarity", () => {
    expect(similarity("best dentist in Lahore", "best dentist in Lahore")).toBe(1);
    expect(similarity("Where can I get braces in Lahore?", "Where can I get dental implants in Lahore?")).toBeLessThan(0.85);
  });

  it("keeps non-Latin questions distinct", () => {
    const urdu = "لاہور میں بہترین ڈینٹسٹ کون ہے؟";
    const urdu2 = "لاہور میں دانتوں کے امپلانٹ کہاں سے کروائیں؟";
    expect(normalizeQueryText(urdu)).not.toBe("");
    expect(normalizeQueryText(urdu)).not.toBe(normalizeQueryText(urdu2));
    expect(isNearDuplicate(urdu2, [urdu])).toBe(false);
    expect(isNearDuplicate(urdu, [urdu])).toBe(true);
    expect(isNearDuplicate("東京で一番の歯医者は？", ["大阪で一番の歯医者は？"])).toBe(false);
  });
});

