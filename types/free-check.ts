import type { ProviderId } from "./domain";

/** Result of the public, rate-limited free AI visibility check. */
export interface FreeCheckResult {
  businessName: string;
  isSimulation: boolean;
  score: number;
  mentionRate: number;
  recommendationRate: number;
  providers: Array<{ provider: ProviderId; score: number; mentioned: number; total: number }>;
  questions: Array<{
    text: string;
    provider: ProviderId;
    mentioned: boolean;
    recommended: boolean;
    position: number | null;
    recommendedInstead: string[];
  }>;
  competitors: Array<{ name: string; mentions: number }>;
  topIssue: { title: string; detail: string };
}
