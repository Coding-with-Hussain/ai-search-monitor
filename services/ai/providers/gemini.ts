import { z } from "zod";

import { extractDomain } from "@/lib/domain";

import { postJson } from "../http";
import { estimateCost, SEARCH_TOOL_FEES } from "../pricing";
import { type AIProvider, ProviderError, type ProviderQueryInput, type ProviderResult, ProviderUnavailableError } from "./types";

const geminiSchema = z.object({
  candidates: z
    .array(
      z.looseObject({
        content: z.looseObject({ parts: z.array(z.looseObject({ text: z.string().optional() })).default([]) }).optional(),
        groundingMetadata: z
          .looseObject({
            groundingChunks: z
              .array(z.looseObject({ web: z.looseObject({ uri: z.string().optional(), title: z.string().optional() }).optional() }))
              .optional(),
          })
          .optional(),
      }),
    )
    .default([]),
  usageMetadata: z
    .looseObject({ promptTokenCount: z.number().optional(), candidatesTokenCount: z.number().optional() })
    .optional(),
  modelVersion: z.string().optional(),
});

export class GeminiProvider implements AIProvider {
  readonly id = "gemini" as const;
  readonly displayName = "Gemini";
  readonly isMock = false;

  constructor(private readonly config: { apiKey?: string; model: string }) {}

  get model() {
    return this.config.model;
  }

  isConfigured() {
    return Boolean(this.config.apiKey);
  }

  async runQuery(input: ProviderQueryInput): Promise<ProviderResult> {
    if (!this.config.apiKey) throw new ProviderUnavailableError(this.id, "GOOGLE_AI_API_KEY is not configured.");
    const started = Date.now();
    const json = await postJson({
      provider: this.id,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.config.model)}:generateContent`,
      headers: { "x-goog-api-key": this.config.apiKey },
      body: {
        contents: [{ role: "user", parts: [{ text: input.query }] }],
        tools: [{ google_search: {} }],
      },
      signal: input.signal,
    });

    const parsed = geminiSchema.safeParse(json);
    if (!parsed.success) throw new ProviderError(this.id, "Unexpected response format from Gemini.");
    const candidate = parsed.data.candidates[0];
    const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    if (!text) throw new ProviderError(this.id, "Gemini returned an empty answer.", { retryable: true });

    // Grounding URIs are redirect links; the title usually carries the source domain.
    const citations = (candidate?.groundingMetadata?.groundingChunks ?? [])
      .map((chunk) => chunk.web)
      .filter((web): web is { uri?: string; title?: string } => Boolean(web?.uri))
      .map((web) => {
        const titleDomain = extractDomain(web.title ?? "");
        const domain = titleDomain ?? extractDomain(web.uri) ?? "unknown";
        return { url: web.uri as string, title: web.title ?? null, domain };
      });

    const inputTokens = parsed.data.usageMetadata?.promptTokenCount ?? null;
    const outputTokens = parsed.data.usageMetadata?.candidatesTokenCount ?? null;
    return {
      provider: this.id,
      query: input.query,
      response: text,
      citations,
      model: parsed.data.modelVersion ?? this.config.model,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage: { inputTokens, outputTokens },
      estimatedCostUsd: estimateCost(this.config.model, inputTokens, outputTokens, SEARCH_TOOL_FEES.geminiGrounding),
      isMock: false,
      raw: { modelVersion: parsed.data.modelVersion, usage: parsed.data.usageMetadata },
    };
  }
}
