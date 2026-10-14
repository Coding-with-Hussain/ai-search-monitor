import type { QueryFilterValues } from "./types";

/** Build a Questions page URL from filters (empty values and page 1 are omitted). */
export function queriesHref(basePath: string, filters: Partial<QueryFilterValues>) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function hasActiveFilters(filters: Partial<QueryFilterValues>) {
  return Boolean(filters.q || filters.category || filters.status || filters.provider);
}
