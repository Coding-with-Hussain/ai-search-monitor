import { z } from "zod";

import { resetPasswordSchema } from "@/schemas/auth";
import { MONITORING_FREQUENCIES, PROVIDER_IDS } from "@/types/domain";

/**
 * Account settings schemas, shared by the client forms (UX) and the settings
 * server actions (which always re-validate). Isomorphic — no server imports.
 */

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .transform((v) => (v === "" ? null : v));

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name").max(100, "Full name must be at most 100 characters"),
  company: optionalText(120, "Company"),
});
export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileValues = z.output<typeof profileSchema>;

/** New password + confirmation (same rules as signup and password reset). */
export const changePasswordSchema = resetPasswordSchema;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

export const NOTIFICATION_KEYS = [
  "weeklyReport",
  "scanCompleted",
  "scoreChanges",
  "visibilityDrops",
  "competitorOvertakes",
] as const;
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

export const notificationPreferencesSchema = z.object({
  weeklyReport: z.boolean(),
  scanCompleted: z.boolean(),
  scoreChanges: z.boolean(),
  visibilityDrops: z.boolean(),
  competitorOvertakes: z.boolean(),
});
export type NotificationPreferencesInput = z.input<typeof notificationPreferencesSchema>;

export const MIN_DEFAULT_QUERIES = 5;
export const MAX_DEFAULT_QUERIES = 100;

export const monitoringDefaultsSchema = z.object({
  frequency: z.enum(MONITORING_FREQUENCIES, "Choose a monitoring frequency"),
  queryCount: z
    .number("Enter a number of questions")
    .int("Use a whole number")
    .min(MIN_DEFAULT_QUERIES, `Monitor at least ${MIN_DEFAULT_QUERIES} questions`)
    .max(MAX_DEFAULT_QUERIES, `Monitor at most ${MAX_DEFAULT_QUERIES} questions`),
  providers: z
    .array(z.enum(PROVIDER_IDS))
    .min(1, "Choose at least one AI platform")
    .transform((list) => [...new Set(list)]),
});
export type MonitoringDefaultsInput = z.input<typeof monitoringDefaultsSchema>;
export type MonitoringDefaultsValues = z.output<typeof monitoringDefaultsSchema>;

export const DELETE_CONFIRMATION_WORD = "DELETE";

export const deleteAccountSchema = z.object({
  confirm: z
    .string()
    .max(20)
    .refine((v) => v.trim() === DELETE_CONFIRMATION_WORD, `Type ${DELETE_CONFIRMATION_WORD} to confirm`),
});
export type DeleteAccountInput = z.input<typeof deleteAccountSchema>;
