import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

import { type AnalyzeInput, analyzeHeuristically } from "./heuristic";
import { analyzeWithLlm, type LlmCompletion, openAiCompletion } from "./llm";
import { type AnalysisResult, analysisResultSchema } from "./schema";

export type { AnalyzeInput } from "./heuristic";
export type { AnalysisResult } from "./schema";

export interface AnalyzerOutcome {
  result: AnalysisResult;
  analyzer: "heuristic" | "llm";
  analyzerModel: string | null;
  estimatedCostUsd: number;
}

export interface AnalyzeOptions {
  /** Simulated responses are always analyzed heuristically (free, deterministic). */
  isMock: boolean;
  /** Override the LLM completion function (tests). */
  completion?: LlmCompletion;
}

function llmCompletionFromEnv(): LlmCompletion | null {
  const e = env();
  if (e.ANALYSIS_MODE === "heuristic" || !e.OPENAI_API_KEY) return null;
  return openAiCompletion({ apiKey: e.OPENAI_API_KEY, model: e.ANALYSIS_MODEL });
}

/**
 * Analyze one AI response. Always computes the heuristic analysis; upgrades to
 * the LLM analyzer for live responses when configured, falling back safely.
 */
export async function analyzeResponse(input: AnalyzeInput, options: AnalyzeOptions): Promise<AnalyzerOutcome> {
  const heuristic = analyzeHeuristically(input);
  const validated = analysisResultSchema.safeParse(heuristic);
  if (!validated.success) {
    // Should never happen; logged so a regression is visible.
    logger.error("analysis.heuristic_invalid", { issues: validated.error.issues.slice(0, 3) });
  }

  const completion = options.isMock ? null : (options.completion ?? llmCompletionFromEnv());
  if (!completion) {
    return { result: heuristic, analyzer: "heuristic", analyzerModel: null, estimatedCostUsd: 0 };
  }

  try {
    const outcome = await analyzeWithLlm(input, heuristic, completion);
    return { result: outcome.result, analyzer: "llm", analyzerModel: outcome.model, estimatedCostUsd: outcome.estimatedCostUsd };
  } catch (error) {
    logger.warn("analysis.llm_failed_fallback", { error: (error as Error).message });
    return { result: heuristic, analyzer: "heuristic", analyzerModel: null, estimatedCostUsd: 0 };
  }
}
