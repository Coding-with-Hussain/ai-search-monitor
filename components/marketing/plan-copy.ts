import { ANNUAL_DISCOUNT, PLAN_IDS, PLANS, type Plan } from "@/lib/billing/plans";
import { formatNumber } from "@/lib/format";
import { SCORE_WEIGHTS } from "@/services/scoring";

/**
 * Copy helpers that derive marketing wording from the plan catalogue and the
 * scoring model, so public pages never drift from what the product enforces.
 */

export type Frequency = Plan["limits"]["monitoringFrequencies"][number];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  manual: "On demand",
};

/** "A", "A and B", "A, B and C". */
export function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function plansWithFrequency(frequency: Frequency) {
  return PLAN_IDS.filter((id) => PLANS[id].limits.monitoringFrequencies.includes(frequency)).map((id) => PLANS[id].name);
}

/** Frequencies offered by every plan, e.g. ["weekly", "monthly", "manual"]. */
export function frequenciesOnEveryPlan(): Frequency[] {
  const [first, ...rest] = PLAN_IDS.map((id) => PLANS[id].limits.monitoringFrequencies);
  return first.filter((f) => rest.every((list) => list.includes(f)));
}

export const annualDiscountPercent = Math.round(ANNUAL_DISCOUNT * 100);

export function competitorsLabel(plan: Plan) {
  return plan.limits.competitorsPerProject === null ? "Unlimited" : formatNumber(plan.limits.competitorsPerProject);
}

export function historyLabel(plan: Plan) {
  return plan.limits.historyDays === null ? "Unlimited" : `${formatNumber(plan.limits.historyDays)} days`;
}

/** One sentence describing how the score weights add up. */
export function scoreWeightsSentence() {
  const w = SCORE_WEIGHTS;
  return `Each monitored AI answer earns up to 100 points: ${w.mentioned} for mentioning your business, ${w.recommended} for actually recommending it, up to ${w.position} for appearing near the top of the list, ${w.citation} when your own website is cited as a source, and up to ${w.sentiment} for positive sentiment.`;
}

export const SCORE_DISCLAIMER =
  "AI answers can vary between runs. Scores are based on the queries and providers monitored by your account.";

export const SCORE_NOT_A_RANKING = "The AI Visibility Score is a proprietary monitoring metric, not a search-engine ranking.";
