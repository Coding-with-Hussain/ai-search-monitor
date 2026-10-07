import { eq } from "drizzle-orm";

import { TRIAL_DAYS } from "@/lib/billing/plans";

import { db } from "../index";
import { type MonitoringDefaults, type NotificationPreferences, profiles, subscriptions } from "../schema";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  weeklyReport: true,
  scanCompleted: true,
  scoreChanges: true,
  visibilityDrops: true,
  competitorOvertakes: true,
};

export const DEFAULT_MONITORING_DEFAULTS: MonitoringDefaults = {
  frequency: "weekly",
  queryCount: 20,
  providers: ["chatgpt", "gemini", "perplexity"],
};

/**
 * Make sure profile + subscription rows exist for an authenticated user. The
 * `on_auth_user_created` trigger normally creates them; this is a safety net
 * (e.g. users created before the migration ran).
 */
export async function ensureUserRecords(user: { id: string; email: string; fullName: string | null }) {
  const existing = await db().select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (existing[0]) return existing[0];
  await db()
    .insert(profiles)
    .values({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      monitoringDefaults: DEFAULT_MONITORING_DEFAULTS,
    })
    .onConflictDoNothing();
  await db()
    .insert(subscriptions)
    .values({
      userId: user.id,
      plan: "starter",
      status: "trialing",
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
    })
    .onConflictDoNothing();
  const created = await db().select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  return created[0];
}

export async function getProfile(userId: string) {
  const rows = await db().select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return rows[0] ?? null;
}

export async function updateProfile(
  userId: string,
  values: Partial<{
    fullName: string | null;
    company: string | null;
    notificationPreferences: NotificationPreferences;
    monitoringDefaults: MonitoringDefaults;
    onboardingCompletedAt: Date;
    tourCompletedAt: Date | null;
  }>,
) {
  await db().update(profiles).set(values).where(eq(profiles.id, userId));
}
