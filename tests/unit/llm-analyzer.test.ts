import { describe, expect, it, vi } from "vitest";

import { analyzeHeuristically } from "@/services/ai/analyzer/heuristic";
import { analyzeResponse } from "@/services/ai/analyzer";
import { analyzeWithLlm, type LlmCompletion, reconcile } from "@/services/ai/analyzer/llm";
import { BUSINESS, COMPETITORS, NOT_MENTIONED, NUMBERED_LIST } from "@/tests/fixtures/responses";
import type { Citation } from "@/types/domain";

const input = (fixture: { response: string; citations: Citation[] }) => ({
  response: fixture.response,
  citations: fixture.citations,
  business: BUSINESS,
  competitors: COMPETITORS,
});

const llmJson = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    business: { mentioned: true, recommended: true, position: 3, sentiment: "positive", evidence: "ABC Dental — top choice" },
    competitors: [{ name: "XYZ Dental", mentioned: true, recommended: true, position: 1, sentiment: "positive" }],
    other_businesses: [{ name: "Bright Dental Studio", position: 4 }],
    explanation: "Recommended third.",
    confidence: 0.9,
    ...overrides,
  });

const completionReturning = (...texts: string[]): LlmCompletion => {
  const fn = vi.fn();
  texts.forEach((t) => fn.mockResolvedValueOnce({ text: t, model: "gpt-test", inputTokens: 100, outputTokens: 50 }));
  return fn as unknown as LlmCompletion;
};

describe("LLM analyzer (never trusted blindly)", () => {
  it("accepts valid structured output", async () => {
    const i = input(NUMBERED_LIST);
    const out = await analyzeWithLlm(i, analyzeHeuristically(i), completionReturning(llmJson()));
    expect(out.result).toMatchObject({ mentioned: true, recommended: true, position: 3 });
    expect(out.model).toBe("gpt-test");
  });

  it("retries once on invalid JSON then succeeds", async () => {
    const i = input(NUMBERED_LIST);
    const complete = completionReturning("not json", llmJson());
    const out = await analyzeWithLlm(i, analyzeHeuristically(i), complete);
    expect(out.result.mentioned).toBe(true);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("throws after repeated invalid output so the caller can fall back", async () => {
    const i = input(NUMBERED_LIST);
    await expect(analyzeWithLlm(i, analyzeHeuristically(i), completionReturning("{}", "[]"))).rejects.toThrow();
  });

  it("rejects hallucinated mentions that are not in the text", () => {
    const i = input(NOT_MENTIONED);
    const r = reconcile(JSON.parse(llmJson()), analyzeHeuristically(i), i);
    expect(r.mentioned).toBe(false);
    expect(r.recommended).toBe(false);
    expect(r.position).toBeNull();
    expect(r.confidence).toBeLessThanOrEqual(0.5);
  });

  it("restores a mention the model missed when the exact name is present", () => {
    const i = input(NUMBERED_LIST);
    const llm = JSON.parse(llmJson({ business: { mentioned: false, recommended: false, position: null, sentiment: null, evidence: null } }));
    const r = reconcile(llm, analyzeHeuristically(i), i);
    expect(r.mentioned).toBe(true);
    expect(r.confidence).toBeLessThanOrEqual(0.7);
  });

  it("computes citations deterministically, ignoring model claims", () => {
    const i = input(NOT_MENTIONED);
    const r = reconcile(JSON.parse(llmJson()), analyzeHeuristically(i), i);
    expect(r.citation).toBe(false);
  });

  it("falls back to the heuristic analyzer when the model fails", async () => {
    const failing: LlmCompletion = vi.fn().mockRejectedValue(new Error("boom"));
    const out = await analyzeResponse(input(NUMBERED_LIST), { isMock: false, completion: failing });
    expect(out.analyzer).toBe("heuristic");
    expect(out.result.position).toBe(3);
  });

  it("never calls the model for simulated responses", async () => {
    const complete: LlmCompletion = vi.fn();
    const out = await analyzeResponse(input(NUMBERED_LIST), { isMock: true, completion: complete });
    expect(out.analyzer).toBe("heuristic");
    expect(complete).not.toHaveBeenCalled();
  });

  it("still records what failed analysis attempts cost", async () => {
    const fn = vi.fn().mockResolvedValue({ text: "not json", model: "gpt-5-mini", inputTokens: 1000, outputTokens: 500 });
    const out = await analyzeResponse(input(NUMBERED_LIST), { isMock: false, completion: fn as unknown as LlmCompletion });
    expect(out.analyzer).toBe("heuristic");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(out.estimatedCostUsd).toBeGreaterThan(0);
  });

  it("trims over-long model output instead of rejecting it", async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ name: `Clinic ${i + 1}`, position: null }));
    const complete = completionReturning(llmJson({ other_businesses: many, explanation: "x".repeat(900) }));
    const out = await analyzeWithLlm(input(NUMBERED_LIST), analyzeHeuristically(input(NUMBERED_LIST)), complete);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(out.result.explanation.length).toBeLessThanOrEqual(600);
  });
});

