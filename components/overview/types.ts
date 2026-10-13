import type { VisibilityPoint } from "@/components/dashboard/visibility-chart";
import type { Priority, ProviderId, RecommendationCategory, ScanMetrics } from "@/types/domain";

/** Why a provider has no results in the latest scan. */
export type ProviderUnavailableReason = "not_configured" | "no_results";

export interface RecommendationPreviewItem {
  id: string;
  title: string;
  reason: string;
  priority: Priority;
  category: RecommendationCategory;
}

/**
 * Everything the overview needs, as plain serializable data, so the signed-in
 * project dashboard and the public demo render the exact same component.
 */
export interface ProjectOverviewData {
  /** "project" links into the app; "demo" sends account-only links to signup. */
  mode: "project" | "demo";
  /** Required in project mode (used to build links). */
  projectId: string | null;
  businessName: string;
  metrics: ScanMetrics;
  previous: ScanMetrics | null;
  /** ISO timestamp of the latest completed scan. */
  scannedAt: string;
  /** Overall + per-provider scores per completed scan (oldest first). */
  history: VisibilityPoint[];
  /** True when any history point came from a simulated scan. */
  historyIncludesSimulation: boolean;
  /** Platforms configured for monitoring (the latest scan may include fewer). */
  monitoredProviders: ProviderId[];
  /** Competitor ids in tracking order (stable chart colors). */
  competitorOrder: string[];
  /** Top open recommendations (already sorted), or null when they failed to load. */
  recommendations: RecommendationPreviewItem[] | null;
  /** Number of open recommendations in total. */
  recommendationCount: number;
  /** The latest scan used simulated AI answers. */
  isSimulation: boolean;
  /** Demo project / public demo data. */
  isDemoData: boolean;
  unavailableReasons: Partial<Record<ProviderId, ProviderUnavailableReason>>;
}

export const TOUR_TARGETS = {
  score: "score",
  platforms: "platforms",
  competitors: "competitors",
  recommendations: "recommendations",
  history: "history",
} as const;

export type TourTarget = (typeof TOUR_TARGETS)[keyof typeof TOUR_TARGETS];
