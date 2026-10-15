import { logger } from "@/lib/logger";

import { postJson } from "../http";
import { estimateCost } from "../pricing";
import type { AnalyzeInput } from "./heuristic";
import { type AnalysisResult, analysisResultSchema, type LlmAnalysis, llmAnalysisSchema } from "./schema";

/**
 * LLM-based analyzer. The model reads the AI answer and returns structured
 * JSON; we never trust it blindly:
 *   1. JSON is validated with Zod (retry once on invalid output),
 *   2. claims are reconciled with deterministic text checks,
 *   3. citations are always computed from real URLs, not model claims,
 *   4. on any failure the caller falls back to the heuristic analyzer.
 */

export type LlmCompletion = (prompt: { system: string; user: string }) => Promise<{
  text: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}>;

const SYSTEM_PROMPT = `You analyze answers produced by AI assistants to buyer questions.
Report, for the target business and each listed competitor, whether the answer mentions it, whether it recommends it, its 1-based position in the answer's recommendation list (null if not listed), and the sentiment of what is said about it.
Also list other businesses the answer recommends.
Only use the answer text. Do not use outside knowledge. If unsure, prefer "not mentioned" and lower confidence.
Respond with JSON only.`;

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["business", "competitors", "other_businesses", "explanation", "confidence"],
  properties: {
    business: {
      type: "object",
      additionalProperties: false,
      required: ["mentioned", "recommended", "position", "sentiment", "evidence"],
      properties: {
        mentioned: { type: "boolean" },
        recommended: { type: "boolean" },
        position: { type: ["integer", "null"] },
        sentiment: { type: ["string", "null"], enum: ["positive", "neutral", "negative", null] },
        evidence: { type: ["string", "null"], description: "Short verbatim excerpt (max 250 chars) about the business" },
      },
    },
    competitors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "mentioned", "recommended", "position", "sentiment"],
        properties: {
          name: { type: "string" },
          mentioned: { type: "boolean" },
          recommended: { type: "boolean" },
          position: { type: ["integer", "null"] },
          sentiment: { type: ["string", "null"], enum: ["positive", "neutral", "negative", null] },
        },
      },
    },
    other_businesses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "position"],
        properties: { name: { type: "string" }, position: { type: ["integer", "null"] } },
      },
    },
    explanation: { type: "string", description: "One or two sentences for a business owner." },
    confidence: { type: "number" },
  },
} as const;

export function buildAnalysisPrompt(input: AnalyzeInput) {
  const competitorList = input.competitors.map((c) => `- ${c.name}${c.domain ? ` (${c.domain})` : ""}`).join("\n") || "- (none)";
  return {
    system: SYSTEM_PROMPT,
    user: `Target business: ${input.business.name}${input.business.domain ? ` (${input.business.domain})` : ""}
Also known as: ${(input.business.aliases ?? []).join(", ") || "-"}
Competitors:
${competitorList}

AI answer to analyze:
"""
${input.response.slice(0, 12_000)}
"""`,
  };
}

export function openAiCompletion(config: { apiKey: string; model: string }): LlmCompletion {
  return async ({ system, user }) => {
    const json = (await postJson({
      provider: "chatgpt",
      url: "https://api.openai.com/v1/responses",
      headers: { authorization: `Bearer ${config.apiKey}` },
      body: {
        model: config.model,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        text: { format: { type: "json_schema", name: "visibility_analysis", schema: JSON_SCHEMA, strict: true } },
      },
      retries: 1,
      timeoutMs: 45_000,
    })) as {
      model?: string;
      output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (json.output ?? [])
      .filter((o) => o.type === "message")
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === "output_text")
      .map((c) => c.text ?? "")
      .join("");
    return {
      text,
      model: json.model ?? config.model,
      inputTokens: json.usage?.input_tokens ?? null,
      outputTokens: json.usage?.output_tokens ?? null,
    };
  };
}

function parseLlmJson(text: string): LlmAnalysis | null {
  try {
    const jsonText = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
    const parsed = llmAnalysisSchema.safeParse(JSON.parse(jsonText));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Merge model output with deterministic checks. Exact text presence beats the
 * model; the model cannot invent mentions that are not in the text.
 */
export function reconcile(llm: LlmAnalysis, heuristic: AnalysisResult, input: AnalyzeInput): AnalysisResult {
  const text = input.response;
  const lower = text.toLowerCase();

  // The heuristic pass already resolved overlapping names (e.g. "Bright Smile"
  // inside "Bright Smile Orthodontics"), so its mention flags are the strict check.
  const presentStrict = heuristic.mentioned;
  const presentLoose = lower.includes(input.business.name.toLowerCase());
  let mentioned = llm.business.mentioned;
  let confidence = llm.confidence;
  if (mentioned && !presentStrict && !presentLoose) {
    mentioned = false;
    confidence = Math.min(confidence, 0.5);
  } else if (!mentioned && presentStrict) {
    mentioned = true;
    confidence = Math.min(confidence, 0.7);
  }
  const recommended = mentioned && (llm.business.mentioned ? llm.business.recommended : heuristic.recommended);
  const position = mentioned ? (llm.business.position ?? heuristic.position) : null;

  const competitors = input.competitors.map((c) => {
    const h = heuristic.competitors.find((x) => x.competitorId === c.id)!;
    const l = llm.competitors.find((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase());
    const strict = h.mentioned;
    const loose = lower.includes(c.name.toLowerCase());
    let cm = l ? l.mentioned : h.mentioned;
    if (cm && !strict && !loose) cm = false;
    if (!cm && strict) cm = true;
    return {
      competitorId: c.id,
      name: c.name,
      mentioned: cm,
      recommended: cm && (l ? l.recommended : h.recommended),
      position: cm ? (l?.position ?? h.position) : null,
      sentiment: cm ? (l?.sentiment ?? h.sentiment ?? "neutral") : null,
      cited: h.cited,
    };
  });

  const tracked = [input.business.name, ...input.competitors.map((c) => c.name)].map((n) => n.toLowerCase());
  const otherBusinesses = llm.other_businesses
    .filter((o) => !tracked.some((t) => o.name.toLowerCase().includes(t)))
    .filter((o) => lower.includes(o.name.toLowerCase().slice(0, Math.min(o.name.length, 12))))
    .slice(0, 25);

  const result: AnalysisResult = {
    mentioned,
    recommended,
    position,
    sentiment: mentioned ? (llm.business.sentiment ?? heuristic.sentiment ?? "neutral") : null,
    citation: heuristic.citation,
    confidence: Math.max(0, Math.min(1, confidence)),
    evidence: (mentioned ? llm.business.evidence : null)?.slice(0, 600) ?? heuristic.evidence,
    explanation: llm.explanation.slice(0, 600),
    competitors,
    otherBusinesses,
  };
  return analysisResultSchema.parse(result);
}

export interface LlmAnalysisOutcome {
  result: AnalysisResult;
  model: string;
  estimatedCostUsd: number;
}

export async function analyzeWithLlm(
  input: AnalyzeInput,
  heuristic: AnalysisResult,
  complete: LlmCompletion,
  maxAttempts = 2,
): Promise<LlmAnalysisOutcome> {
  const prompt = buildAnalysisPrompt(input);
  let cost = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const out = await complete(prompt);
    cost += estimateCost(out.model, out.inputTokens, out.outputTokens);
    const parsed = parseLlmJson(out.text);
    if (parsed) {
      return { result: reconcile(parsed, heuristic, input), model: out.model, estimatedCostUsd: cost };
    }
    logger.warn("analysis.invalid_llm_output", { attempt, model: out.model, sample: out.text.slice(0, 200) });
  }
  throw new Error("LLM analysis returned invalid output after retries");
}
