import { z } from "zod";

import { BUSINESS_TYPES, MONITORING_FREQUENCIES, PRIORITIES, PROVIDER_IDS, QUERY_CATEGORIES } from "@/types/domain";

/**
 * Zod schemas shared by client forms (React Hook Form) and server actions.
 * The server always re-validates — client validation is for UX only.
 */

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const websiteSchema = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(v), "Enter a valid website, e.g. example.com")
  .optional()
  .transform((v) => (v ? v : undefined));

export const businessInfoSchema = z.object({
  name: trimmed(1, 120, "Business name"),
  website: websiteSchema,
  industry: trimmed(2, 80, "Industry"),
  businessType: z.enum(BUSINESS_TYPES),
  country: z.string().trim().max(80).optional().transform((v) => v || undefined),
  city: z.string().trim().max(80).optional().transform((v) => v || undefined),
  description: z.string().trim().max(500).optional().transform((v) => v || undefined),
});

export const servicesSchema = z
  .array(trimmed(2, 60, "Service"))
  .min(1, "Add at least one product or service")
  .max(15, "Add up to 15 products or services");

export const competitorInputSchema = z.object({
  name: trimmed(1, 120, "Competitor name"),
  website: websiteSchema,
});

export const monitoringSchema = z.object({
  generateQueries: z.boolean(),
  frequency: z.enum(MONITORING_FREQUENCIES),
  queryCount: z.number().int().min(5, "Monitor at least 5 questions").max(100, "Monitor at most 100 questions"),
  providers: z.array(z.enum(PROVIDER_IDS)).min(1, "Choose at least one AI platform"),
});

export const createProjectSchema = businessInfoSchema
  .extend({
    services: servicesSchema,
    competitors: z.array(competitorInputSchema).max(30),
    monitoring: monitoringSchema,
    runFirstScan: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.businessType === "local" && !v.city) {
      ctx.addIssue({ code: "custom", path: ["city"], message: "City is required for local businesses" });
    }
  });

export type CreateProjectInput = z.input<typeof createProjectSchema>;

export const updateProjectSchema = businessInfoSchema.extend({
  services: servicesSchema,
  aliases: z.array(trimmed(2, 120, "Alias")).max(10).default([]),
  monitoringFrequency: z.enum(MONITORING_FREQUENCIES),
  monitoringEnabled: z.boolean(),
  providers: z.array(z.enum(PROVIDER_IDS)).min(1, "Choose at least one AI platform"),
});

export const addQuerySchema = z.object({
  text: trimmed(5, 300, "Question"),
  category: z.enum(QUERY_CATEGORIES),
  priority: z.enum(PRIORITIES),
  service: z.string().trim().max(60).optional().transform((v) => v || undefined),
});

export const queryFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(QUERY_CATEGORIES).optional(),
  status: z.enum(["active", "paused", "mentioned", "not_mentioned", "recommended"]).optional(),
  provider: z.enum(PROVIDER_IDS).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
