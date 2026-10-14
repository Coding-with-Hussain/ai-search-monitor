import type { Priority, ProviderId, QueryCategory } from "@/types/domain";

/**
 * Serializable shapes passed from the Questions server pages to client
 * components. Mirrors `db/repositories/analysis.ts` without importing server code.
 */

export type ResultState = "recommended" | "mentioned" | "not_mentioned" | "failed" | "unavailable" | "pending" | "not_analyzed";

export interface ProviderResult {
  state: ResultState;
  position: number | null;
}

export interface QueryRowData {
  id: string;
  text: string;
  category: QueryCategory;
  priority: Priority;
  status: "active" | "paused";
  source: "generated" | "manual";
  service: string | null;
  results: Partial<Record<ProviderId, ProviderResult>>;
}

export interface QueryFilterValues {
  q?: string;
  category?: QueryCategory;
  status?: "active" | "paused" | "mentioned" | "not_mentioned" | "recommended";
  provider?: ProviderId;
  page: number;
}
