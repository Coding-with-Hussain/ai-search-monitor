import { z } from "zod";

import type { AnalysisCompetitorResult, OtherBusiness, Sentiment } from "@/types/domain";

/**
 * Zod schemas at the analyzer boundary. Every analysis result — heuristic or
 * LLM — is validated against `analysisResultSchema` before it is stored.
 */

export const sentimentSchema = z.enum(["positive", "neutral", "negative"]);

export const competitorResultSchema = z.object({
  competitorId: z.string(),
  name: z.string(),
  mentioned: z.boolean(),
  recommended: z.boolean(),
  position: z.number().int().positive().nullable(),
  sentiment: sentimentSchema.nullable(),
  cited: z.boolean(),
});

export const otherBusinessSchema = z.object({
  name: z.string().min(1).max(120),
  position: z.number().int().positive().nullable(),
});

export const analysisResultSchema = z
  .object({
    mentioned: z.boolean(),
    recommended: z.boolean(),
    position: z.number().int().positive().nullable(),
    sentiment: sentimentSchema.nullable(),
    citation: z.boolean(),
    confidence: z.number().min(0).max(1),
    evidence: z.string().max(600).nullable(),
    explanation: z.string().max(600),
    competitors: z.array(competitorResultSchema),
    otherBusinesses: z.array(otherBusinessSchema).max(25),
  })
  .superRefine((value, ctx) => {
    if (!value.mentioned && value.recommended) {
      ctx.addIssue({ code: "custom", message: "recommended requires mentioned", path: ["recommended"] });
    }
    if (!value.mentioned && value.position !== null) {
      ctx.addIssue({ code: "custom", message: "position requires mentioned", path: ["position"] });
    }
  });

export interface AnalysisResult {
  mentioned: boolean;
  recommended: boolean;
  position: number | null;
  sentiment: Sentiment | null;
  citation: boolean;
  confidence: number;
  evidence: string | null;
  explanation: string;
  competitors: AnalysisCompetitorResult[];
  otherBusinesses: OtherBusiness[];
}

/**
 * The JSON shape we ask the LLM analyzer to return. Kept separate (and
 * permissive) because model output is untrusted: it is parsed with this
 * schema, then reconciled with deterministic checks before use.
 */
export const llmAnalysisSchema = z.object({
  business: z.object({
    mentioned: z.boolean(),
    recommended: z.boolean(),
    position: z.number().int().min(1).max(50).nullable(),
    sentiment: sentimentSchema.nullable(),
    evidence: z.string().max(600).nullable(),
  }),
  competitors: z
    .array(
      z.object({
        name: z.string(),
        mentioned: z.boolean(),
        recommended: z.boolean(),
        position: z.number().int().min(1).max(50).nullable(),
        sentiment: sentimentSchema.nullable(),
      }),
    )
    .default([]),
  other_businesses: z
    .array(z.object({ name: z.string().min(1).max(120), position: z.number().int().min(1).max(50).nullable() }))
    .max(25)
    .default([]),
  explanation: z.string().max(600),
  confidence: z.number().min(0).max(1),
});

export type LlmAnalysis = z.infer<typeof llmAnalysisSchema>;
