/** Client-safe shape returned by GET /api/scans/[scanId]. */
export interface ScanProgressDto {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  mode: "live" | "mock";
  totalItems: number;
  completedItems: number;
  failedItems: number;
  queryCount: number;
  providerCount: number;
  currentProvider: string | null;
  currentQuery: string | null;
  score: number | null;
  error: string | null;
  notes: string[];
}
