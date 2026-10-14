import { PRIORITIES, type Priority, RECOMMENDATION_CATEGORIES, type RecommendationCategory } from "@/types/domain";

/** Client-safe labels and URL helpers for the Recommendations area. */

export const RECOMMENDATION_STATUS_VALUES = ["open", "completed", "dismissed"] as const;
export type RecommendationStatusValue = (typeof RECOMMENDATION_STATUS_VALUES)[number];

export const STATUS_LABEL: Record<RecommendationStatusValue, string> = {
  open: "Open",
  completed: "Completed",
  dismissed: "Dismissed",
};

export const CATEGORY_LABEL: Record<RecommendationCategory, string> = {
  website: "Website",
  content: "Content",
  authority: "Authority",
  local_seo: "Local SEO",
  brand: "Brand",
  reviews: "Reviews",
  citations: "Citations",
  services: "Services",
};

export const CATEGORY_OPTIONS = RECOMMENDATION_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABEL[value] }));

export const PRIORITY_LABEL: Record<Priority, string> = { high: "High priority", medium: "Medium priority", low: "Low priority" };
export const PRIORITY_SHORT: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };
export const PRIORITY_BADGE: Record<Priority, "warning" | "secondary" | "outline"> = {
  high: "warning",
  medium: "secondary",
  low: "outline",
};
export const PRIORITY_OPTIONS = PRIORITIES.map((value) => ({ value, label: PRIORITY_SHORT[value] }));

export const IMPACT_LABEL: Record<"low" | "medium" | "high", string> = { low: "Low", medium: "Medium", high: "High" };
export const DIFFICULTY_LABEL: Record<"easy" | "medium" | "hard", string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export interface RecommendationFilterValues {
  status: RecommendationStatusValue;
  priority?: Priority;
  category?: RecommendationCategory;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(values: readonly T[], value: string | undefined): T | undefined {
  return value !== undefined && (values as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Read filters from search params; unknown values are ignored. */
export function parseRecommendationFilters(params: Record<string, string | string[] | undefined>): RecommendationFilterValues {
  return {
    status: oneOf(RECOMMENDATION_STATUS_VALUES, first(params.status)) ?? "open",
    priority: oneOf(PRIORITIES, first(params.priority)),
    category: oneOf(RECOMMENDATION_CATEGORIES, first(params.category)),
  };
}

/** Build a Recommendations URL (defaults are omitted). */
export function recommendationsHref(basePath: string, filters: Partial<RecommendationFilterValues>) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "open") params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.category) params.set("category", filters.category);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function hasRecommendationFilters(filters: Partial<RecommendationFilterValues>) {
  return Boolean(filters.priority || filters.category);
}
