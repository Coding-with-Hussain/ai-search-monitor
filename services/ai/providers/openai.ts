import { z } from "zod";

import { extractDomain } from "@/lib/domain";

import { postJson } from "../http";
import { estimateCost, SEARCH_TOOL_FEES } from "../pricing";
import { type AIProvider, ProviderError, type ProviderQueryInput, type ProviderResult, ProviderUnavailableError } from "./types";

/** Shape of the parts of the OpenAI Responses API we consume. */
const responsesSchema = z.object({
  model: z.string().optional(),
  output: z
    .array(
      z.looseObject({
        type: z.string(),
        content: z
          .array(
            z.looseObject({
              type: z.string(),
              text: z.string().optional(),
              annotations: z
                .array(z.looseObject({ type: z.string(), url: z.string().optional(), title: z.string().optional() }))
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .default([]),
  usage: z.looseObject({ input_tokens: z.number().optional(), output_tokens: z.number().optional() }).optional(),
});

export class ChatGPTProvider implements AIProvider {
  readonly id = "chatgpt" as const;
  readonly displayName = "ChatGPT";
  readonly isMock = false;

  constructor(
    private readonly config: { apiKey?: string; model: string; webSearch: boolean },
  ) {}

  get model() {
    return this.config.model;
  }

  isConfigured() {
    return Boolean(this.config.apiKey);
  }

  async runQuery(input: ProviderQueryInput): Promise<ProviderResult> {
    if (!this.config.apiKey) throw new ProviderUnavailableError(this.id, "OPENAI_API_KEY is not configured.");
    const started = Date.now();
    const json = await postJson({
      provider: this.id,
      url: "https://api.openai.com/v1/responses",
      headers: { authorization: `Bearer ${this.config.apiKey}` },
      body: {
        model: this.config.model,
        input: input.query,
        ...(this.config.webSearch ? { tools: [{ type: "web_search" }] } : {}),
      },
      signal: input.signal,
    });

    const parsed = responsesSchema.safeParse(json);
    if (!parsed.success) throw new ProviderError(this.id, "Unexpected response format from OpenAI.");

    let text = "";
    const citations = new Map<string, { url: string; title: string | null; domain: string }>();
    for (const item of parsed.data.output) {
      if (item.type !== "message") continue;
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && part.text) text += (text ? "\n" : "") + part.text;
        for (const ann of part.annotations ?? []) {
          if (ann.type === "url_citation" && ann.url) {
            const domain = extractDomain(ann.url);
            if (domain && !citations.has(ann.url)) citations.set(ann.url, { url: ann.url, title: ann.title ?? null, domain });
          }
        }
      }
    }
    if (!text.trim()) throw new ProviderError(this.id, "OpenAI returned an empty answer.", { retryable: true });

    const inputTokens = parsed.data.usage?.input_tokens ?? null;
    const outputTokens = parsed.data.usage?.output_tokens ?? null;
    return {
      provider: this.id,
      query: input.query,
      response: text,
      citations: [...citations.values()],
      model: parsed.data.model ?? this.config.model,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage: { inputTokens, outputTokens },
      estimatedCostUsd: estimateCost(
        this.config.model,
        inputTokens,
        outputTokens,
        this.config.webSearch ? SEARCH_TOOL_FEES.openaiWebSearch : 0,
      ),
      isMock: false,
      raw: { model: parsed.data.model, usage: parsed.data.usage },
    };
  }
}
