import { z } from "zod";

import { BUSINESS_TYPES } from "@/types/domain";

/** Public free-checker form (validated on the client and again on the server). */
export const freeCheckSchema = z
  .object({
    businessName: z.string().trim().min(2, "Enter your business name").max(120, "Business name is too long"),
    website: z
      .string()
      .trim()
      .max(200)
      .refine((v) => v === "" || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(v), "Enter a valid website, e.g. example.com")
      .optional()
      .transform((v) => v || undefined),
    industry: z.string().trim().min(2, "Enter your industry, e.g. Dentist").max(80),
    businessType: z.enum(BUSINESS_TYPES),
    city: z.string().trim().max(80).optional().transform((v) => v || undefined),
    country: z.string().trim().max(80).optional().transform((v) => v || undefined),
    /** Honeypot — humans never see or fill this field. */
    company: z.string().max(200).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.businessType === "local" && !v.city) {
      ctx.addIssue({ code: "custom", path: ["city"], message: "City is required for local businesses" });
    }
  });

export type FreeCheckInput = z.input<typeof freeCheckSchema>;
