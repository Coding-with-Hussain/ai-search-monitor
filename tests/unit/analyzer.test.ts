import { describe, expect, it } from "vitest";

import { analyzeHeuristically, findMentions, parseListItems } from "@/services/ai/analyzer/heuristic";
import { analysisResultSchema } from "@/services/ai/analyzer/schema";
import {
  BUSINESS,
  COMPETITORS,
  HEADING_LIST,
  NEGATIVE_MENTION,
  NOT_MENTIONED,
  NUMBERED_LIST,
  PROSE_RECOMMENDATION,
} from "@/tests/fixtures/responses";

function analyze(fixture: { response: string; citations: { url: string; title?: string | null; domain: string }[] }) {
  return analyzeHeuristically({ response: fixture.response, citations: fixture.citations, business: BUSINESS, competitors: COMPETITORS });
}

describe("heuristic analyzer", () => {
  it("analyzes the spec example: mentioned, recommended, position 2, positive, cited", () => {
    const r = analyze(PROSE_RECOMMENDATION);
    expect(r.mentioned).toBe(true);
    expect(r.recommended).toBe(true);
    expect(r.position).toBe(2);
    expect(r.sentiment).toBe("positive");
    expect(r.citation).toBe(true);
    const xyz = r.competitors.find((c) => c.name === "XYZ Dental");
    expect(xyz?.mentioned).toBe(true);
    expect(xyz?.position).toBe(1);
    expect(r.evidence).toContain("ABC Dental");
    expect(analysisResultSchema.safeParse(r).success).toBe(true);
  });

  it("uses list order for positions and detects other businesses", () => {
    const r = analyze(NUMBERED_LIST);
    expect(r.position).toBe(3);
    expect(r.recommended).toBe(true);
    expect(r.citation).toBe(false);
    expect(r.competitors.find((c) => c.name === "XYZ Dental")).toMatchObject({ position: 1, cited: true, recommended: true });
    expect(r.competitors.find((c) => c.name === "Smile Clinic")).toMatchObject({ position: 2 });
    expect(r.competitors.find((c) => c.name === "Dental Care Lahore")).toMatchObject({ mentioned: false, position: null });
    expect(r.otherBusinesses).toEqual([{ name: "Bright Dental Studio", position: 4 }]);
    expect(r.explanation).toMatch(/position #3/);
  });

  it("reports not mentioned and who was recommended instead", () => {
    const r = analyze(NOT_MENTIONED);
    expect(r.mentioned).toBe(false);
    expect(r.recommended).toBe(false);
    expect(r.position).toBeNull();
    expect(r.sentiment).toBeNull();
    expect(r.explanation).toMatch(/not mentioned/);
    expect(r.evidence).toMatch(/XYZ Dental/);
    expect(analysisResultSchema.safeParse(r).success).toBe(true);
  });

  it("does not treat a lowercase generic phrase as a competitor mention", () => {
    // "dental care in Lahore" must not match the competitor "Dental Care Lahore".
    const r = analyze(NOT_MENTIONED);
    expect(r.competitors.find((c) => c.name === "Dental Care Lahore")?.mentioned).toBe(false);
  });

  it("detects negative context and withholds the recommendation", () => {
    const r = analyze(NEGATIVE_MENTION);
    expect(r.mentioned).toBe(true);
    expect(r.recommended).toBe(false);
    expect(r.sentiment).toBe("negative");
  });

  it("handles markdown heading lists and inline domain citations", () => {
    const r = analyze(HEADING_LIST);
    expect(r.position).toBe(2);
    expect(r.citation).toBe(true); // domain mentioned inline
  });

  it("matches aliases and legal suffix variants", () => {
    expect(findMentions("Try ABC Dental Ltd for implants", { name: "ABC Dental Ltd" }).mentions).toHaveLength(1);
    expect(findMentions("ABC Dental is great", { name: "ABC Dental Ltd" }).mentions).toHaveLength(1);
    const alias = findMentions("Many people like ABCD for whitening", { name: "ABC Dental", aliases: ["ABCD"] });
    expect(alias.mentions).toHaveLength(1);
    expect(alias.viaAlias).toBe(true);
  });

  it("respects word boundaries", () => {
    expect(findMentions("Visit SuperABC Dentalworks", { name: "ABC Dental" }).mentions).toHaveLength(0);
  });

  it("parses nested bullets as one item", () => {
    const items = parseListItems("1. **Alpha** — great\n   - sub point\n2. **Beta** — fine");
    expect(items.map((i) => i.lead)).toEqual(["Alpha", "Beta"]);
    expect(items[0].text).toContain("sub point");
  });

  it("is deterministic", () => {
    expect(analyze(NUMBERED_LIST)).toEqual(analyze(NUMBERED_LIST));
  });

  it("ignores tip-style list items when extracting other businesses", () => {
    const r = analyzeHeuristically({
      response: "1. **Consider** your budget.\n2. **Check reviews** online.\n3. **ABC Dental** — excellent care.",
      citations: [],
      business: BUSINESS,
      competitors: [],
    });
    expect(r.otherBusinesses).toEqual([]);
    expect(r.position).toBe(1);
  });

  it("credits a list item to the most specific name when names overlap", () => {
    const r = analyzeHeuristically({
      response: [
        "Top orthodontists in Austin:",
        "1. **Bright Smile Orthodontics** – Highly rated for clear aligners.",
        "2. **Lone Star Braces** – Affordable payment plans.",
      ].join("\n"),
      citations: [],
      business: { name: "Bright Smile", domain: "brightsmile.com" },
      competitors: [
        { id: "c1", name: "Bright Smile Orthodontics" },
        { id: "c2", name: "Lone Star Braces" },
      ],
    });
    expect(r.mentioned).toBe(false);
    expect(r.position).toBeNull();
    expect(r.competitors.find((c) => c.competitorId === "c1")).toMatchObject({ mentioned: true, recommended: true, position: 1 });
  });

  it("only treats the exact site (or a subdomain) written in the answer as a citation", () => {
    const run = (response: string) =>
      analyzeHeuristically({ response, citations: [], business: { name: "Smile Dental", domain: "smiledental.com" }, competitors: [] }).citation;
    expect(run("Smile Dental is great. See notsmiledental.com for details.")).toBe(false);
    expect(run("Smile Dental is great. See smiledental.com.au for details.")).toBe(false);
    expect(run("Smile Dental is great. Book at smiledental.com.")).toBe(true);
    expect(run("Smile Dental is great. Book at book.smiledental.com today.")).toBe(true);
  });
});

