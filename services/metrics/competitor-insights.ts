import { providerName } from "@/lib/providers-meta";
import type { CompetitorMetrics, ScanMetrics } from "@/types/domain";

/**
 * "Why are they winning?" — observed differences between your business and a
 * competitor in the monitored answers. These are signals from monitored data,
 * not proven causal factors; the UI must present them that way.
 */

export interface CompetitorSignal {
  key: string;
  title: string;
  detail: string;
  /** Size of the observed gap in percentage points (for ordering). */
  gap: number;
}

export interface CompetitorInsight {
  competitor: CompetitorMetrics;
  scoreGap: number;
  signals: CompetitorSignal[];
}

const r = (n: number) => Math.round(n);

export function competitorInsight(metrics: ScanMetrics, competitorId: string): CompetitorInsight | null {
  const competitor = metrics.competitors.find((c) => c.competitorId === competitorId);
  if (!competitor) return null;
  const you = metrics.overall;
  const them = competitor.metrics;
  const signals: CompetitorSignal[] = [];

  if (them.citationRate - you.citationRate >= 5) {
    signals.push({
      key: "citations",
      title: "Higher citation coverage",
      detail: `Its website was cited in ${r(them.citationRate)}% of monitored answers vs ${r(you.citationRate)}% for yours.`,
      gap: them.citationRate - you.citationRate,
    });
  }
  if (them.mentionRate - you.mentionRate >= 5) {
    signals.push({
      key: "mentions",
      title: "Mentioned in more answers",
      detail: `Mentioned in ${r(them.mentionRate)}% of answers vs ${r(you.mentionRate)}% for you.`,
      gap: them.mentionRate - you.mentionRate,
    });
  }
  if (them.recommendationRate - you.recommendationRate >= 5) {
    signals.push({
      key: "recommendations",
      title: "Recommended more often",
      detail: `Recommended in ${r(them.recommendationRate)}% of answers vs ${r(you.recommendationRate)}% for you.`,
      gap: them.recommendationRate - you.recommendationRate,
    });
  }
  if (them.averagePosition !== null && you.averagePosition !== null && you.averagePosition - them.averagePosition >= 0.5) {
    signals.push({
      key: "position",
      title: "Listed higher in recommendations",
      detail: `Average position #${them.averagePosition} vs #${you.averagePosition} for you.`,
      gap: (you.averagePosition - them.averagePosition) * 10,
    });
  }
  if (them.shareOfVoice - you.shareOfVoice >= 3) {
    signals.push({
      key: "sov",
      title: "Larger share of voice",
      detail: `${r(them.shareOfVoice)}% of all recommendations vs ${r(you.shareOfVoice)}% for you.`,
      gap: them.shareOfVoice - you.shareOfVoice,
    });
  }

  const leadsIn = [...metrics.categories, ...metrics.services].filter(
    (s) => s.bestCompetitor?.name === competitor.name && s.bestCompetitor.mentionRate - s.mentionRate >= 20,
  );
  if (leadsIn.length) {
    const top = leadsIn.slice(0, 3);
    signals.push({
      key: "segments",
      title: "Appears in more specific questions",
      detail: `Leads in ${top.map((s) => `${s.label.toLowerCase()} (${r(s.bestCompetitor!.mentionRate)}% vs ${r(s.mentionRate)}%)`).join(", ")}.`,
      gap: Math.max(...top.map((s) => s.bestCompetitor!.mentionRate - s.mentionRate)),
    });
  }

  const ownSourceDomain = competitor.domain ? metrics.topSources.find((s) => s.domain === competitor.domain) : null;
  if (ownSourceDomain && ownSourceDomain.share >= 10) {
    signals.push({
      key: "own-site",
      title: "Its website is a frequently cited source",
      detail: `${ownSourceDomain.domain} appeared as a source in ${r(ownSourceDomain.share)}% of answers.`,
      gap: ownSourceDomain.share,
    });
  }

  const weakProvider = metrics.providers
    .filter((p) => p.status !== "unavailable")
    .map((p) => ({ p, gap: them.score - p.score }))
    .sort((a, b) => b.gap - a.gap)[0];
  if (weakProvider && weakProvider.gap >= 15) {
    signals.push({
      key: `provider-${weakProvider.p.provider}`,
      title: `Stronger where you are weakest (${providerName(weakProvider.p.provider)})`,
      detail: `Your ${providerName(weakProvider.p.provider)} score is ${r(weakProvider.p.score)}, while ${competitor.name} averages ${r(them.score)} overall.`,
      gap: weakProvider.gap,
    });
  }

  return {
    competitor,
    scoreGap: Math.round((them.score - you.score) * 10) / 10,
    signals: signals.sort((a, b) => b.gap - a.gap),
  };
}

/** Strongest competitor (highest score) or null. */
export function strongestCompetitor(metrics: ScanMetrics) {
  return [...metrics.competitors].sort((a, b) => b.metrics.score - a.metrics.score)[0] ?? null;
}
