import type { ComparisonEntity } from "@/components/dashboard/competitor-comparison";
import type { EntityMetrics, ProviderId } from "@/types/domain";

/**
 * Illustrative numbers for the marketing site. Every place that renders these
 * labels them as an example — they are not measurements of a real business.
 */

export const EXAMPLE_BUSINESS = {
  name: "Lakeside Dental",
  descriptor: "Family dentist · Portland, OR",
  questions: 40,
};

export const EXAMPLE_SCORE = 72;
export const EXAMPLE_SCORE_DELTA = 6;

export const EXAMPLE_PLATFORM_SCORES: Array<{ provider: ProviderId; score: number }> = [
  { provider: "chatgpt", score: 82 },
  { provider: "gemini", score: 68 },
  { provider: "perplexity", score: 74 },
];

export const EXAMPLE_METRICS: Array<{ label: string; value: string; suffix?: string; delta?: number; deltaSuffix?: string; invert?: boolean }> = [
  { label: "Mentioned in", value: "64", suffix: "% of answers", delta: 5, deltaSuffix: " pts" },
  { label: "Recommended in", value: "41", suffix: "% of answers", delta: 3, deltaSuffix: " pts" },
  { label: "Average position", value: "2.4", delta: -0.4, invert: true },
  { label: "Share of voice", value: "27", suffix: "%", delta: 2, deltaSuffix: " pts" },
];

function metrics(score: number, mentionRate: number, recommendationRate: number, averagePosition: number, shareOfVoice: number): EntityMetrics {
  const runs = 120;
  return {
    score,
    mentionRate,
    recommendationRate,
    averagePosition,
    citationRate: 0,
    shareOfVoice,
    runs,
    mentions: Math.round((mentionRate / 100) * runs),
    recommendations: Math.round((recommendationRate / 100) * runs),
    sentiment: { positive: 0, neutral: 0, negative: 0 },
  };
}

/** You 72 vs Competitor A 81, B 69, C 54. */
export const EXAMPLE_COMPETITORS: ComparisonEntity[] = [
  { key: "you", name: EXAMPLE_BUSINESS.name, isYou: true, metrics: metrics(72, 64, 41, 2.4, 27) },
  { key: "a", name: "Competitor A", isYou: false, metrics: metrics(81, 78, 52, 1.8, 34) },
  { key: "b", name: "Competitor B", isYou: false, metrics: metrics(69, 61, 37, 2.7, 22) },
  { key: "c", name: "Competitor C", isYou: false, metrics: metrics(54, 47, 24, 3.6, 12) },
];
