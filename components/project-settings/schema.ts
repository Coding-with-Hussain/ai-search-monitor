import type { z } from "zod";

import { updateProjectSchema } from "@/schemas/project";

/**
 * Project settings form schema: the shared `updateProjectSchema` plus the
 * same "local businesses need a city" rule onboarding applies. Used by the
 * client form (UX) and re-validated by the server action.
 */
export const projectSettingsSchema = updateProjectSchema.superRefine((v, ctx) => {
  if (v.businessType === "local" && !v.city) {
    ctx.addIssue({ code: "custom", path: ["city"], message: "City is required for local businesses" });
  }
  const seen = new Set<string>();
  v.services.forEach((s, i) => {
    const key = s.toLowerCase();
    if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["services", i], message: `“${s}” is listed twice` });
    seen.add(key);
  });
  const name = v.name.trim().toLowerCase();
  v.aliases.forEach((a, i) => {
    if (a.trim().toLowerCase() === name) {
      ctx.addIssue({ code: "custom", path: ["aliases", i], message: "An alias doesn't need to repeat the business name" });
    }
  });
});

export type ProjectSettingsInput = z.input<typeof projectSettingsSchema>;
export type ProjectSettingsValues = z.output<typeof projectSettingsSchema>;
