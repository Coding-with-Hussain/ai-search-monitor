import { formatPercent, pluralize } from "@/lib/format";
import { providerName } from "@/lib/providers-meta";
import type { CompetitorMetrics, ScanMetrics } from "@/types/domain";

/**
 * Top wins and top problems for one scan, derived only from observed signals
 * in its metrics snapshot (and the previous completed scan, when given).
 * Pure and deterministic, so the history page and stored reports agree.
 * Sentences describe what was observed in monitored answers; they never
 * claim causes or guarantee future AI recommendations.
 */

export interface ScanInsights {
  wins: string[];
  problems: string[];
}

interface Ranked {
  text: string;
  /** Lower comes first. */
  rank: number;
}

const DEFAULT_LIMIT = 5;
const r = (n: number) => Math.round(n);
const points = (n: number) => pluralize(Math.abs(r(n)), "point");

function scoreOf(c: CompetitorMetrics) {
  return c.metrics.score;
}

export function computeScanInsights(
  metrics: ScanMetrics,
  previous: ScanMetrics | null = null,
  { limit = DEFAULT_LIMIT }: { limit?: number } = {},
): ScanInsights {
  const wins: Ranked[] = [];
  const problems: Ranked[] = [];
  const o = metrics.overall;

  if (metrics.runsSucceeded === 0 || o.runs === 0) {
    return {
      wins: [],
      problems: ["No AI answers could be collected in this scan, so no visibility signals were observed."],
    };
  }

  const prev = previous && previous.runsSucceeded > 0 && previous.overall.runs > 0 ? previous : null;

  // 1. Overall score change.
  if (prev) {
    const delta = Math.round((o.score - prev.overall.score) * 10) / 10;
    if (delta >= 1) {
      wins.push({ rank: 0, text: `AI Visibility rose ${points(delta)}, from ${r(prev.overall.score)} to ${r(o.score)}, since the previous scan.` });
    } else if (delta <= -1) {
      problems.push({ rank: 0, text: `AI Visibility fell ${points(delta)}, from ${r(prev.overall.score)} to ${r(o.score)}, since the previous scan.` });
    }
  }

  // 2. Competitor overtakes (only competitors present in both scans).
  const overtakenIds = new Set<string>();
  if (prev) {
    for (const c of metrics.competitors) {
      const before = prev.competitors.find((p) => p.competitorId === c.competitorId);
      if (!before) continue;
      const wasAhead = scoreOf(before) > prev.overall.score;
      const isAhead = scoreOf(c) > o.score;
      if (wasAhead && !isAhead) {
        wins.push({ rank: 1, text: `Moved ahead of ${c.name} (${r(o.score)} vs ${r(scoreOf(c))}).` });
      } else if (!wasAhead && isAhead) {
        overtakenIds.add(c.competitorId);
        problems.push({ rank: 1, text: `${c.name} moved ahead of you (${r(scoreOf(c))} vs ${r(o.score)}).` });
      }
    }
  }

  // 3. Standing against tracked competitors.
  const competitors = [...metrics.competitors].sort((a, b) => scoreOf(b) - scoreOf(a));
  const ahead = competitors.filter((c) => scoreOf(c) > o.score);
  if (competitors.length > 0 && ahead.length === 0) {
    const closest = competitors[0];
    wins.push({
      rank: 2,
      text:
        competitors.length === 1
          ? `Ahead of your tracked competitor ${closest.name} (${r(o.score)} vs ${r(scoreOf(closest))}).`
          : `Ahead of all ${competitors.length} tracked competitors. The closest, ${closest.name}, scores ${r(scoreOf(closest))} vs your ${r(o.score)}.`,
    });
  } else if (ahead.length > 0 && !overtakenIds.has(ahead[0].competitorId)) {
    const top = ahead[0];
    const others = ahead.length - 1;
    problems.push({
      rank: 2,
      text: `${top.name} scores ${points(scoreOf(top) - o.score)} higher (${r(scoreOf(top))} vs ${r(o.score)})${
        others > 0 ? `, and ${pluralize(others, "other tracked competitor")} ${others === 1 ? "is" : "are"} also ahead` : ""
      }.`,
    });
  }

  // 4. First-place recommendations.
  const totalQuestions = metrics.queries.length;
  const firstPlace = metrics.queries.filter((q) => q.recommendedIn > 0 && q.bestPosition === 1).length;
  if (firstPlace > 0) {
    wins.push({
      rank: 3,
      text: `Recommended first in ${firstPlace} of ${pluralize(totalQuestions, "monitored question")} on at least one AI platform.`,
    });
  }

  // 5. Questions where the business never appears.
  const missing = metrics.queries.filter((q) => q.mentionedIn === 0 && q.runs > 0).length;
  if (missing > 0) {
    problems.push({
      rank: 3,
      text: `Not mentioned in any AI answer for ${missing} of ${pluralize(totalQuestions, "monitored question")}.`,
    });
  } else if (totalQuestions > 0) {
    wins.push({ rank: 6, text: "Mentioned in at least one AI answer for every monitored question." });
  }

  // 6. Strongest and weakest AI platform.
  const platforms = metrics.providers.filter((p) => p.status !== "unavailable" && p.runs > 0).sort((a, b) => b.score - a.score);
  if (platforms.length >= 2) {
    const best = platforms[0];
    const worst = platforms[platforms.length - 1];
    if (best.score >= 40) {
      wins.push({
        rank: 4,
        text: `Strongest on ${providerName(best.provider)}: ${r(best.score)}/100, recommended in ${formatPercent(best.recommendationRate)} of its answers.`,
      });
    }
    if (worst.score < 40 || best.score - worst.score >= 10) {
      problems.push({
        rank: 4,
        text: `Weakest on ${providerName(worst.provider)}: ${r(worst.score)}/100, mentioned in ${formatPercent(worst.mentionRate)} of its answers.`,
      });
    }
  } else if (platforms.length === 1) {
    const only = platforms[0];
    if (only.score >= 40) wins.push({ rank: 4, text: `Scored ${r(only.score)}/100 on ${providerName(only.provider)}.` });
    else problems.push({ rank: 4, text: `Scored only ${r(only.score)}/100 on ${providerName(only.provider)}.` });
  }

  // 7. Strongest and weakest question type.
  const categories = metrics.categories.filter((c) => c.runs >= 2).sort((a, b) => b.mentionRate - a.mentionRate);
  if (categories.length > 0) {
    const best = categories[0];
    if (best.mentionRate >= 50) {
      wins.push({
        rank: 5,
        text: `Mentioned in ${formatPercent(best.mentionRate)} of ${best.label.toLowerCase()} answers, your strongest question type.`,
      });
    }
    const worst = categories[categories.length - 1];
    if (categories.length >= 2 && worst.mentionRate < 50) {
      const rival =
        worst.bestCompetitor && worst.bestCompetitor.mentionRate > worst.mentionRate
          ? ` ${worst.bestCompetitor.name} appeared in ${formatPercent(worst.bestCompetitor.mentionRate)}.`
          : "";
      problems.push({
        rank: 5,
        text: `Mentioned in only ${formatPercent(worst.mentionRate)} of ${worst.label.toLowerCase()} answers.${rival}`,
      });
    }
  }

  // 8. Own-website citations.
  if (o.citationRate < 20) {
    problems.push({ rank: 6, text: `Your website was cited as a source in only ${formatPercent(o.citationRate)} of monitored answers.` });
  } else if (prev && o.citationRate - prev.overall.citationRate >= 5) {
    wins.push({
      rank: 6,
      text: `Your website was cited in ${formatPercent(o.citationRate)} of monitored answers, up from ${formatPercent(prev.overall.citationRate)}.`,
    });
  }

  // 9. Data coverage problems.
  if (metrics.unavailableProviders.length > 0) {
    const names = metrics.unavailableProviders.map(providerName).join(", ");
    problems.push({ rank: 7, text: `No results from ${names} in this scan, so the score is based on the other platforms.` });
  }
  if (metrics.runsFailed > 0) {
    problems.push({ rank: 8, text: `${pluralize(metrics.runsFailed, "AI answer")} could not be collected in this scan.` });
  }

  const pick = (items: Ranked[]) =>
    items
      .map((item, index) => ({ ...item, index }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .slice(0, limit)
      .map((item) => item.text);

  return { wins: pick(wins), problems: pick(problems) };
}
