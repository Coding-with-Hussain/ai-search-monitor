import { describe, expect, it } from "vitest";

import {
  aggregateSignals,
  positionPoints,
  SCORE_WEIGHTS,
  scoreBand,
  scoreBreakdown,
  scoreChange,
  scoreResult,
  sentimentPoints,
} from "@/services/scoring";

const base = { mentioned: true, recommended: true, position: 1, sentiment: "positive" as const, citation: true };

describe("scoring engine", () => {
  it("weights sum to 100", () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("gives a perfect result 100", () => {
    expect(scoreResult(base)).toBe(100);
  });

  it("scores 0 when the business is not mentioned, regardless of other signals", () => {
    expect(scoreResult({ ...base, mentioned: false })).toBe(0);
    expect(scoreResult({ mentioned: false, recommended: false, position: null, sentiment: null, citation: true })).toBe(0);
  });

  it("awards position points only when recommended, decaying with rank", () => {
    expect(positionPoints(1)).toBe(20);
    expect(positionPoints(2)).toBeLessThan(positionPoints(1));
    expect(positionPoints(3)).toBeLessThan(positionPoints(2));
    expect(positionPoints(4)).toBeLessThan(positionPoints(3));
    expect(positionPoints(12)).toBeGreaterThan(0);
    expect(positionPoints(null)).toBe(0);
    expect(scoreResult({ ...base, recommended: false })).toBe(25 + 15 + 10);
  });

  it("applies a lower score for low positions", () => {
    expect(scoreResult({ ...base, position: 8 })).toBeLessThan(scoreResult({ ...base, position: 2 }));
  });

  it("maps sentiment to points", () => {
    expect(sentimentPoints("positive")).toBe(10);
    expect(sentimentPoints("neutral")).toBe(5);
    expect(sentimentPoints("negative")).toBe(0);
  });

  it("breakdown totals match scoreResult", () => {
    for (const s of [base, { ...base, position: 5, citation: false }, { ...base, recommended: false, sentiment: "negative" as const }]) {
      expect(scoreBreakdown(s).total).toBe(scoreResult(s));
    }
  });

  it("aggregates rates, average position and sentiment", () => {
    const m = aggregateSignals([
      base,
      { ...base, position: 3, citation: false },
      { mentioned: true, recommended: false, position: null, sentiment: "neutral", citation: false },
      { mentioned: false, recommended: false, position: null, sentiment: null, citation: false },
    ]);
    expect(m.runs).toBe(4);
    expect(m.mentionRate).toBe(75);
    expect(m.recommendationRate).toBe(50);
    expect(m.averagePosition).toBe(2);
    expect(m.citationRate).toBe(25);
    expect(m.sentiment).toEqual({ positive: 2, neutral: 1, negative: 0 });
    expect(m.score).toBeGreaterThan(0);
  });

  it("returns empty metrics for no runs without dividing by zero", () => {
    const m = aggregateSignals([]);
    expect(m.score).toBe(0);
    expect(m.mentionRate).toBe(0);
    expect(m.averagePosition).toBeNull();
  });

  it("computes score change in points and percent", () => {
    expect(scoreChange(72, 64)).toBe(8);
    expect(scoreChange(50, null)).toBeNull();
    // Difference of the displayed whole numbers: 53.4 → 49.0 reads as 53 → 49.
    expect(scoreChange(49.0, 53.4)).toBe(-4);
    expect(scoreChange(68.2, 58.3)).toBe(10);
  });

  it("bands scores", () => {
    expect(scoreBand(75)).toBe("strong");
    expect(scoreBand(50)).toBe("moderate");
    expect(scoreBand(10)).toBe("weak");
    expect(scoreBand(null)).toBe("none");
  });
});
