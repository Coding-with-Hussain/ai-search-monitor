/**
 * Plan catalogue — the single source of truth for pricing and limits.
 *
 * Never hard-code a limit elsewhere: read it from `PLANS` (or the
 * `getEntitlements` helper in ./entitlements.ts, which also applies the
 * subscription status).
 */

export const PLAN_IDS = ["starter", "growth", "pro", "agency"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export type BillingInterval = "month" | "year";

export interface PlanLimits {
  /** Projects (monitored businesses) the account may own. */
  projects: number;
  /** Buyer questions checked per calendar billing period (1 question × 1 scan = 1 query). */
  queriesPerMonth: number;
  /** Competitors per project. `null` = unlimited. */
  competitorsPerProject: number | null;
  /** Shortest allowed automatic monitoring frequency. */
  monitoringFrequencies: Array<"daily" | "weekly" | "monthly" | "manual">;
  /** Days of scan history visible in the UI. `null` = unlimited. */
  historyDays: number | null;
  /** Team seats (future). */
  seats: number;
}

export interface PlanFeatures {
  historicalTracking: boolean;
  advancedRecommendations: boolean;
  pdfReports: boolean;
  whiteLabelReports: boolean;
  teamMembers: boolean;
  emailReports: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Monthly price in USD when billed monthly. */
  monthlyPrice: number;
  limits: PlanLimits;
  features: PlanFeatures;
  /** Marketing bullet points shown on pricing cards. */
  highlights: string[];
  popular?: boolean;
}

/** Annual billing discount. Change here and the pricing UI + Stripe setup script follow. */
export const ANNUAL_DISCOUNT = 0.2;

/** Free trial granted at signup (no card required). */
export const TRIAL_DAYS = 14;

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "For a single business that wants to know where it stands.",
    monthlyPrice: 19,
    limits: {
      projects: 1,
      queriesPerMonth: 50,
      competitorsPerProject: 3,
      monitoringFrequencies: ["weekly", "monthly", "manual"],
      historyDays: 90,
      seats: 1,
    },
    features: {
      historicalTracking: false,
      advancedRecommendations: false,
      pdfReports: false,
      whiteLabelReports: false,
      teamMembers: false,
      emailReports: true,
    },
    highlights: ["1 project", "50 queries / month", "3 competitors", "Weekly monitoring", "Basic reports"],
  },
  growth: {
    id: "growth",
    name: "Growth",
    tagline: "For growing businesses tracking several brands or locations.",
    monthlyPrice: 49,
    popular: true,
    limits: {
      projects: 3,
      queriesPerMonth: 250,
      competitorsPerProject: 10,
      monitoringFrequencies: ["weekly", "monthly", "manual"],
      historyDays: null,
      seats: 1,
    },
    features: {
      historicalTracking: true,
      advancedRecommendations: true,
      pdfReports: false,
      whiteLabelReports: false,
      teamMembers: false,
      emailReports: true,
    },
    highlights: [
      "3 projects",
      "250 queries / month",
      "10 competitors per project",
      "Historical tracking",
      "Advanced recommendations",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For marketing teams and consultants who report on AI visibility.",
    monthlyPrice: 99,
    limits: {
      projects: 10,
      queriesPerMonth: 1000,
      competitorsPerProject: 20,
      monitoringFrequencies: ["daily", "weekly", "monthly", "manual"],
      historyDays: null,
      seats: 3,
    },
    features: {
      historicalTracking: true,
      advancedRecommendations: true,
      pdfReports: true,
      whiteLabelReports: false,
      teamMembers: true,
      emailReports: true,
    },
    highlights: ["10 projects", "1,000 queries / month", "20 competitors per project", "PDF reports", "Team support"],
  },
  agency: {
    id: "agency",
    name: "Agency",
    tagline: "For agencies monitoring AI visibility for many clients.",
    monthlyPrice: 149,
    limits: {
      projects: 25,
      queriesPerMonth: 2500,
      competitorsPerProject: null,
      monitoringFrequencies: ["daily", "weekly", "monthly", "manual"],
      historyDays: null,
      seats: 10,
    },
    features: {
      historicalTracking: true,
      advancedRecommendations: true,
      pdfReports: true,
      whiteLabelReports: true,
      teamMembers: true,
      emailReports: true,
    },
    highlights: [
      "25 projects",
      "2,500 queries / month",
      "Unlimited competitors",
      "White-label reports",
      "Multiple users",
    ],
  },
};

export function getPlan(id: string | null | undefined): Plan {
  return (id && id in PLANS ? PLANS[id as PlanId] : PLANS.starter);
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

/** Price per month for display, after any annual discount. */
export function displayMonthlyPrice(plan: Plan, interval: BillingInterval) {
  return interval === "year" ? Math.round(plan.monthlyPrice * (1 - ANNUAL_DISCOUNT) * 100) / 100 : plan.monthlyPrice;
}

/** Total charged per billing cycle in USD. */
export function cyclePrice(plan: Plan, interval: BillingInterval) {
  return interval === "year" ? Math.round(plan.monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT)) : plan.monthlyPrice;
}

/** Stripe price lookup key; the Stripe setup script creates prices with these keys. */
export function stripeLookupKey(plan: PlanId, interval: BillingInterval) {
  return `aivm_${plan}_${interval === "year" ? "yearly" : "monthly"}`;
}

export function nextPlan(id: PlanId): Plan | null {
  const idx = PLAN_IDS.indexOf(id);
  return idx >= 0 && idx < PLAN_IDS.length - 1 ? PLANS[PLAN_IDS[idx + 1]] : null;
}
