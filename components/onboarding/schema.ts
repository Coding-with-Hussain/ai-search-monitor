import type { z } from "zod";

import { createProjectSchema } from "@/schemas/project";

/**
 * Onboarding form schema: `createProjectSchema` plus cross-field checks that
 * only make sense when a project is created in one go. Shared by the wizard
 * (React Hook Form resolver) and `createProjectAction` (server re-validation).
 */
export const onboardingSchema = createProjectSchema.superRefine((value, ctx) => {
  const own = value.name.trim().toLowerCase();
  const seen = new Set<string>();
  value.competitors.forEach((competitor, index) => {
    const key = competitor.name.trim().toLowerCase();
    if (!key) return;
    if (own && key === own) {
      ctx.addIssue({
        code: "custom",
        path: ["competitors", index, "name"],
        message: "A competitor can't have the same name as your business.",
      });
    } else if (seen.has(key)) {
      ctx.addIssue({ code: "custom", path: ["competitors", index, "name"], message: "You've already added this competitor." });
    }
    seen.add(key);
  });
});

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingValues = z.output<typeof onboardingSchema>;

/** Hard cap from `createProjectSchema` (competitors array max), applied even on unlimited plans. */
export const MAX_ONBOARDING_COMPETITORS = 30;
/** Maximum products/services (matches `servicesSchema`). */
export const MAX_SERVICES = 15;
export const MIN_QUERY_COUNT = 5;
export const MAX_QUERY_COUNT = 100;
