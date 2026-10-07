/**
 * Approximate list prices used for cost accounting. These are *estimates* for
 * internal tracking and pricing decisions — update them as providers change
 * prices. Unknown models fall back to a conservative default.
 */

interface ModelPrice {
  /** USD per 1M input tokens */
  input: number;
  /** USD per 1M output tokens */
  output: number;
  /** Flat USD per request (e.g. web search / grounding fees) */
  perRequest?: number;
}

const PRICES: Record<string, ModelPrice> = {
  "gpt-5-mini": { input: 0.25, output: 2.0 },
  "gpt-5": { input: 1.25, output: 10.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  sonar: { input: 1.0, output: 1.0, perRequest: 0.005 },
  "sonar-pro": { input: 3.0, output: 15.0, perRequest: 0.006 },
};

const FALLBACK: ModelPrice = { input: 2.0, output: 8.0 };

/** Extra per-request fees for search tools. */
export const SEARCH_TOOL_FEES = {
  openaiWebSearch: 0.01,
  geminiGrounding: 0.035,
};

export function estimateCost(
  model: string,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
  extraPerRequest = 0,
) {
  const key = Object.keys(PRICES).find((k) => model === k || model.startsWith(`${k}-`)) ?? model;
  const price = PRICES[key] ?? FALLBACK;
  const cost =
    ((inputTokens ?? 0) / 1_000_000) * price.input +
    ((outputTokens ?? 0) / 1_000_000) * price.output +
    (price.perRequest ?? 0) +
    extraPerRequest;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
