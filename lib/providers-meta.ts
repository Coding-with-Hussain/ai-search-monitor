import type { ProviderId } from "@/types/domain";

/**
 * Client-safe provider metadata (names, chart colors). No secrets here.
 * Chart colors follow the validated categorical palette order so a provider
 * keeps the same color everywhere in the product.
 */
export const PROVIDER_META: Record<
  ProviderId,
  { name: string; vendor: string; chartVar: string; description: string }
> = {
  chatgpt: {
    name: "ChatGPT",
    vendor: "OpenAI",
    chartVar: "var(--series-1)",
    description: "OpenAI's assistant, queried with web search enabled where available.",
  },
  gemini: {
    name: "Gemini",
    vendor: "Google",
    chartVar: "var(--series-2)",
    description: "Google's assistant, grounded with Google Search where available.",
  },
  perplexity: {
    name: "Perplexity",
    vendor: "Perplexity AI",
    chartVar: "var(--series-3)",
    description: "Answer engine that cites the web sources it used.",
  },
};

export function providerName(id: string) {
  return PROVIDER_META[id as ProviderId]?.name ?? id;
}
