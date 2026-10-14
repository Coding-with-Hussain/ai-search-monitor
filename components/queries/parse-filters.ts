import { queryFiltersSchema } from "@/schemas/project";

import type { QueryFilterValues } from "./types";

type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Parse Questions page search params. Invalid or empty values are dropped
 * one by one, so a bad `category` never discards a valid `q` or `page`.
 */
export function parseQueryFilters(searchParams: RawSearchParams): QueryFilterValues {
  const first = (key: string) => {
    const v = searchParams[key];
    const value = Array.isArray(v) ? v[0] : v;
    return value === undefined || value.trim() === "" ? undefined : value;
  };
  const shape = queryFiltersSchema.shape;
  const q = shape.q.safeParse(first("q"));
  const category = shape.category.safeParse(first("category"));
  const status = shape.status.safeParse(first("status"));
  const provider = shape.provider.safeParse(first("provider"));
  const page = shape.page.safeParse(first("page"));
  return {
    q: q.success && q.data ? q.data : undefined,
    category: category.success ? category.data : undefined,
    status: status.success ? status.data : undefined,
    provider: provider.success ? provider.data : undefined,
    page: page.success ? page.data : 1,
  };
}
