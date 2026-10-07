import type { ScanMetrics } from "./domain";

/** Point-in-time report content, stored on `reports.snapshot`. */
export interface ReportSnapshot {
  version: 1;
  generatedAt: string;
  business: {
    name: string;
    website: string | null;
    industry: string;
    location: string | null;
  };
  period: { start: string | null; end: string };
  isSimulation: boolean;
  scanId: string;
  metrics: ScanMetrics;
  history: Array<{ date: string; score: number }>;
  previousScore: number | null;
  wins: string[];
  problems: string[];
  recommendations: Array<{ title: string; priority: string; action: string; reason: string }>;
  whiteLabel: { brandName: string } | null;
}
