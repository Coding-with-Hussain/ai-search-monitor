import { z } from "zod";

import { extractDomain } from "@/lib/domain";

import { postJson } from "../http";
import { estimateCost } from "../pricing";
import { type AIProvider, ProviderError, type ProviderQueryInput, type ProviderResult, ProviderUnavailableError } from "./types";

const perplexitySchema = z.object({
  model: z.string().optional(),
  choices: z.array(z.looseObject({ message: z.looseObject({ content: z.string().optional() }) })).default([]),
  citations: z.array(z.string()).optional(),
  search_results: z.array(z.looseObject({ url: z.string(), title: z.string().optional() })).optional(),
  usage: z
    .looseObject({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      cost: z.looseObject({ total_cost: z.number().optional() }).optional(),
    })
    .optional(),
});

export class PerplexityProvider implements AIProvider {
  readonly id = "perplexity" as const;
  readonly displayName = "Perplexity";
  readonly isMock = false;

  constructor(private readonly config: { apiKey?: string; model: string }) {}

  get model() {
    return this.config.model;
  }

  isConfigured() {
    return Boolean(this.config.apiKey);
  }

  async runQuery(input: ProviderQueryInput): Promise<ProviderResult> {
    if (!this.config.apiKey) throw new ProviderUnavailableError(this.id, "PERPLEXITY_API_KEY is not configured.");
    const started = Date.now();
    const json = await postJson({
      provider: this.id,
      url: "https://api.perplexity.ai/chat/completions",
      headers: { authorization: `Bearer ${this.config.apiKey}` },
      body: { model: this.config.model, messages: [{ role: "user", content: input.query }] },
      signal: input.signal,
    });

    const parsed = perplexitySchema.safeParse(json);
    if (!parsed.success) throw new ProviderError(this.id, "Unexpected response format from Perplexity.");
    const text = parsed.data.choices[0]?.message.content?.trim() ?? "";
    if (!text) throw new ProviderError(this.id, "Perplexity returned an empty answer.", { retryable: true });

    const titles = new Map((parsed.data.search_results ?? []).map((r) => [r.url, r.title ?? null]));
    const urls = parsed.data.citations ?? (parsed.data.search_results ?? []).map((r) => r.url);
    const citations = [...new Set(urls)].flatMap((url) => {
      const domain = extractDomain(url);
      return domain ? [{ url, title: titles.get(url) ?? null, domain }] : [];
    });

    const inputTokens = parsed.data.usage?.prompt_tokens ?? null;
    const outputTokens = parsed.data.usage?.completion_tokens ?? null;
    return {
      provider: this.id,
      query: input.query,
      response: text,
      citations,
      model: parsed.data.model ?? this.config.model,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage: { inputTokens, outputTokens },
      estimatedCostUsd:
        parsed.data.usage?.cost?.total_cost ?? estimateCost(this.config.model, inputTokens, outputTokens),
      isMock: false,
      raw: { model: parsed.data.model, usage: parsed.data.usage },
    };
  }
}
