import { env } from "@/lib/env";
import { PROVIDER_IDS, type ProviderId, type ScanMode } from "@/types/domain";

import { ChatGPTProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import { MockProvider } from "./mock";
import { PerplexityProvider } from "./perplexity";
import type { AIProvider } from "./types";

/**
 * Resolve the provider implementation for a scan mode. The rest of the app
 * only ever sees the `AIProvider` interface.
 */
export function getProvider(id: ProviderId, mode: ScanMode): AIProvider {
  const e = env();
  if (mode === "mock") return new MockProvider(id, e.NODE_ENV === "test" ? 0 : e.MOCK_LATENCY_MS);
  switch (id) {
    case "chatgpt":
      return new ChatGPTProvider({ apiKey: e.OPENAI_API_KEY, model: e.OPENAI_MODEL, webSearch: e.OPENAI_WEB_SEARCH });
    case "gemini":
      return new GeminiProvider({ apiKey: e.GOOGLE_AI_API_KEY, model: e.GEMINI_MODEL });
    case "perplexity":
      return new PerplexityProvider({ apiKey: e.PERPLEXITY_API_KEY, model: e.PERPLEXITY_MODEL });
  }
}

/** Which mode new scans run in, based on configuration. */
export function currentScanMode(): ScanMode {
  return env().AI_VISIBILITY_MOCK_MODE ? "mock" : "live";
}

export interface ProviderStatus {
  id: ProviderId;
  configured: boolean;
  model: string;
}

/** Configuration status for every provider in live mode (for settings/admin UI). */
export function providerStatuses(): ProviderStatus[] {
  return PROVIDER_IDS.map((id) => {
    const p = getProvider(id, "live");
    return { id, configured: p.isConfigured(), model: p.model };
  });
}
