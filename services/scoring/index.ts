import type { EntityMetrics, Sentiment } from "@/types/domain";

/**
 * AI Visibility scoring model — the ONLY place the score formula lives.
 *
 * Per (query × provider) result, max 100:
 *   Mentioned            25
 *   Recommended          30
 *   Position             up to 20 (only when recommended; #1 = 20, decays with rank)
 *   Own site cited       15
 *   Sentiment            positive 10 · neutral 5 · negative 0
 * A business that is not mentioned scores 0 for that result.
 *
 * Aggregate scores (project, provider, competitor) are the mean of result
 * scores. This is a proprietary monitoring metric based on the questions and
 * providers monitored — not a search-engine ranking. Bump SCORING_VERSION
 * whenever weights change so stored snapshots can be identified/recalculated.
 */

export const SCORING_VERSION = "2026-10.1";

export const SCORE_WEIGHTS = {
  mentioned: 25,
  recommended: 30,
  position: 20,
  citation: 15,
  sentiment: 10,
} as const;

/** Points for list position when recommended. Top 3 earn most of the weight. */
export function positionPoints(position: number | null | undefined): number {
  if (!position || position < 1) return 0;
  const table = [20, 18, 16, 10, 8, 6];
  if (position <= table.length) return table[position - 1];
  if (position <= 10) return 4;
  return 2;
}

export function sentimentPoints(sentiment: Sentiment | null | undefined): number {
  if (sentiment === "positive") return SCORE_WEIGHTS.sentiment;
  if (sentiment === "neutral") return SCORE_WEIGHTS.sentiment / 2;
  return 0;
}

export interface ResultSignals {
  mentioned: boolean;
  recommended: boolean;
  position: number | null;
  sentiment: Sentiment | null;
  citation: boolean;
}

export function scoreResult(r: ResultSignals): number {
  if (!r.mentioned) return 0;
  let score = SCORE_WEIGHTS.mentioned;
  if (r.recommended) score += SCORE_WEIGHTS.recommended + positionPoints(r.position);
  if (r.citation) score += SCORE_WEIGHTS.citation;
  score += sentimentPoints(r.sentiment);
  return Math.min(100, score);
}

export interface ScoreBreakdown {
  mentioned: number;
  recommended: number;
  position: number;
  citation: number;
  sentiment: number;
  total: number;
}

export function scoreBreakdown(r: ResultSignals): ScoreBreakdown {
  if (!r.mentioned) return { mentioned: 0, recommended: 0, position: 0, citation: 0, sentiment: 0, total: 0 };
  const b = {
    mentioned: SCORE_WEIGHTS.mentioned,
    recommended: r.recommended ? SCORE_WEIGHTS.recommended : 0,
    position: r.recommended ? positionPoints(r.position) : 0,
    citation: r.citation ? SCORE_WEIGHTS.citation : 0,
    sentiment: sentimentPoints(r.sentiment),
  };
  return { ...b, total: Math.min(100, b.mentioned + b.recommended + b.position + b.citation + b.sentiment) };
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Aggregate a set of per-result signals into entity metrics (shareOfVoice filled by caller). */
export function aggregateSignals(results: ResultSignals[]): EntityMetrics {
  const runs = results.length;
  const mentions = results.filter((r) => r.mentioned).length;
  const recommendations = results.filter((r) => r.recommended).length;
  const positions = results.filter((r) => r.recommended && r.position).map((r) => r.position as number);
  const cited = results.filter((r) => r.citation).length;
  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  for (const r of results) if (r.mentioned && r.sentiment) sentiment[r.sentiment]++;
  return {
    score: round1(avg(results.map(scoreResult))),
    mentionRate: pct(mentions, runs),
    recommendationRate: pct(recommendations, runs),
    averagePosition: positions.length ? round1(avg(positions)) : null,
    citationRate: pct(cited, runs),
    shareOfVoice: 0,
    runs,
    mentions,
    recommendations,
    sentiment,
  };
}

/** Change between two scores, as points and percent (null when no baseline). */
export function scoreChange(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null) return null;
  const points = round1(current - previous);
  const percent = previous > 0 ? round1(((current - previous) / previous) * 100) : null;
  return { points, percent };
}

export function scoreBand(score: number | null | undefined): "strong" | "moderate" | "weak" | "none" {
  if (score == null) return "none";
  if (score >= 70) return "strong";
  if (score >= 40) return "moderate";
  return "weak";
}
