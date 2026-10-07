/**
 * Shared domain types used across services, the database layer and the UI.
 * Keep this file free of runtime code so it can be imported anywhere.
 */

export const PROVIDER_IDS = ["chatgpt", "gemini", "perplexity"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const QUERY_CATEGORIES = [
  "best_of",
  "recommendation",
  "local",
  "comparison",
  "product_service",
  "problem_based",
  "purchase_intent",
  "brand_comparison",
] as const;
export type QueryCategory = (typeof QUERY_CATEGORIES)[number];

export const BUSINESS_TYPES = ["local", "saas", "ecommerce", "services"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const RECOMMENDATION_CATEGORIES = [
  "website",
  "content",
  "authority",
  "local_seo",
  "brand",
  "reviews",
  "citations",
  "services",
] as const;
export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number];

export const MONITORING_FREQUENCIES = ["daily", "weekly", "monthly", "manual"] as const;
export type MonitoringFrequency = (typeof MONITORING_FREQUENCIES)[number];

export type ScanStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type ScanMode = "live" | "mock";

/** The business context every provider/analyzer/generator works from. */
export interface BusinessContext {
  name: string;
  website?: string | null;
  domain?: string | null;
  industry: string;
  businessType: BusinessType;
  city?: string | null;
  country?: string | null;
  services: string[];
  aliases?: string[];
  description?: string | null;
}

export interface CompetitorContext {
  id: string;
  name: string;
  domain?: string | null;
  aliases?: string[];
}

export interface Citation {
  url: string;
  title?: string | null;
  domain: string;
}

/** Per-competitor outcome inside a single analyzed AI response. */
export interface AnalysisCompetitorResult {
  competitorId: string;
  name: string;
  mentioned: boolean;
  recommended: boolean;
  position: number | null;
  sentiment: Sentiment | null;
  cited: boolean;
}

/** A business the AI recommended that is neither the user nor a tracked competitor. */
export interface OtherBusiness {
  name: string;
  position: number | null;
}

/** Aggregated visibility metrics for one entity (the business or a competitor). */
export interface EntityMetrics {
  score: number;
  mentionRate: number;
  recommendationRate: number;
  averagePosition: number | null;
  citationRate: number;
  shareOfVoice: number;
  runs: number;
  mentions: number;
  recommendations: number;
  sentiment: { positive: number; neutral: number; negative: number };
}

export interface ProviderMetrics extends EntityMetrics {
  provider: ProviderId;
  status: "ok" | "partial" | "unavailable";
  queriesAnalyzed: number;
  failedRuns: number;
}

export interface CompetitorMetrics {
  competitorId: string;
  name: string;
  domain: string | null;
  metrics: EntityMetrics;
}

export interface ShareOfVoiceSlice {
  key: string;
  name: string;
  kind: "business" | "competitor" | "others";
  mentions: number;
  share: number;
}

export interface SegmentMetrics {
  key: string;
  label: string;
  queries: number;
  runs: number;
  score: number;
  mentionRate: number;
  bestCompetitor: { name: string; mentionRate: number } | null;
}

export interface SourceDomainStat {
  domain: string;
  count: number;
  share: number;
  isOwnDomain: boolean;
  competitorName: string | null;
}

export interface QuerySummary {
  queryId: string | null;
  text: string;
  category: QueryCategory;
  priority: Priority;
  score: number;
  mentionedIn: number;
  recommendedIn: number;
  bestPosition: number | null;
  runs: number;
  providers: Partial<
    Record<ProviderId, { mentioned: boolean; recommended: boolean; position: number | null; score: number }>
  >;
}

/**
 * Snapshot stored on `scans.metrics` when a scan completes. Everything the
 * dashboard needs is precomputed here so page loads stay cheap; raw rows are
 * kept so the snapshot can be recalculated if the scoring model changes.
 */
export interface ScanMetrics {
  version: 1;
  scoringVersion: string;
  overall: EntityMetrics;
  providers: ProviderMetrics[];
  competitors: CompetitorMetrics[];
  shareOfVoice: ShareOfVoiceSlice[];
  categories: SegmentMetrics[];
  services: SegmentMetrics[];
  topSources: SourceDomainStat[];
  queries: QuerySummary[];
  competitorGap: { points: number; competitorName: string } | null;
  runsTotal: number;
  runsSucceeded: number;
  runsFailed: number;
  unavailableProviders: ProviderId[];
}
