"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { toFriendlyAuthError } from "@/components/auth/server";
import {
  changePasswordSchema,
  type ChangePasswordInput,
  deleteAccountSchema,
  type DeleteAccountInput,
  monitoringDefaultsSchema,
  type MonitoringDefaultsInput,
  notificationPreferencesSchema,
  type NotificationPreferencesInput,
  profileSchema,
  type ProfileInput,
} from "@/components/settings/schemas";
import { db } from "@/db";
import { getProfile, updateProfile } from "@/db/repositories/profiles";
import { profiles } from "@/db/schema";
import { runAction } from "@/lib/action-utils";
import { requireUserOrThrow } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import { PLAN_IDS, PLANS } from "@/lib/billing/plans";
import { features } from "@/lib/env";
import { AppError, notConfigured, notFound } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cancelSubscriptionsForDeletion } from "@/services/billing/account";

/**
 * Account settings actions. Every action identifies the account from the
 * session (never from input), re-validates input with Zod and returns an
 * ActionResult via runAction.
 */

export async function updateProfileAction(input: ProfileInput) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const { fullName, company } = profileSchema.parse(input);
    await updateProfile(user.id, { fullName, company });

    // Keep the auth profile in sync (used in emails and as a fallback name). Best effort.
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
      if (error) logger.warn("settings.profile_auth_sync_failed", { code: error.code });
    } catch (error) {
      logger.warn("settings.profile_auth_sync_failed", { error: (error as Error).message });
    }

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { fullName, company };
  }, "settings.updateProfile");
}

export async function changePasswordAction(input: ChangePasswordInput) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const { password } = changePasswordSchema.parse(input);
    await enforceRateLimit(
      `settings:password:${user.id}`,
      5,
      900,
      "You've tried to change your password several times. Please wait a few minutes and try again.",
    );

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const friendly = toFriendlyAuthError(error, "change_password");
      const reason = friendly.details?.reason;
      if (reason === "session_missing") {
        throw new AppError("UNAUTHORIZED", "Your session has expired. Please sign in again to change your password.", 401);
      }
      if (reason === "reauthentication_needed") {
        throw new AppError(
          "FORBIDDEN",
          "For your security, please sign out and sign back in, then change your password within a few minutes.",
          403,
        );
      }
      throw friendly;
    }
    logger.info("settings.password_changed", { userId: user.id });
    return null;
  }, "settings.changePassword");
}

export async function updateNotificationPreferencesAction(input: NotificationPreferencesInput) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const preferences = notificationPreferencesSchema.parse(input);
    await updateProfile(user.id, { notificationPreferences: preferences });
    revalidatePath("/settings");
    return preferences;
  }, "settings.updateNotifications");
}

function plansWithFrequency(frequency: string) {
  const names = PLAN_IDS.filter((id) => (PLANS[id].limits.monitoringFrequencies as string[]).includes(frequency)).map(
    (id) => PLANS[id].name,
  );
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "higher");
}

export async function updateMonitoringDefaultsAction(input: MonitoringDefaultsInput) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const defaults = monitoringDefaultsSchema.parse(input);
    const ent = await getEntitlements(user.id);
    if (!ent.plan.limits.monitoringFrequencies.includes(defaults.frequency)) {
      throw new AppError(
        "PLAN_LIMIT",
        `${defaults.frequency === "daily" ? "Daily" : "This"} monitoring is available on the ${plansWithFrequency(defaults.frequency)} plans. Upgrade to use it, or choose another frequency.`,
        402,
        { limit: "monitoring_frequency", plan: ent.plan.id },
      );
    }
    await updateProfile(user.id, { monitoringDefaults: defaults });
    revalidatePath("/settings");
    revalidatePath("/onboarding");
    return defaults;
  }, "settings.updateMonitoringDefaults");
}

/**
 * Permanently delete the signed-in user's account: cancel any Stripe
 * subscription that could still charge them, delete the auth user (all data
 * cascades from auth.users -> profiles -> projects …), sign out, and redirect
 * to the home page. Requires typing DELETE.
 */
export async function deleteAccountAction(input: DeleteAccountInput) {
  const result = await runAction(async () => {
    const user = await requireUserOrThrow();
    deleteAccountSchema.parse(input);
    if (!features.serviceRole()) {
      throw notConfigured("Account deletion isn't available in this environment. Please contact support to delete your account.");
    }
    await enforceRateLimit(`settings:delete_account:${user.id}`, 5, 3600);

    const profile = await getProfile(user.id);
    if (!profile) throw notFound("We couldn't find your account. Please sign in again.");

    // Stop billing first: if this fails, nothing has been deleted yet.
    try {
      await cancelSubscriptionsForDeletion(user.id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("settings.delete_account_cancel_failed", { userId: user.id, error: (error as Error).message });
      throw new AppError(
        "CONFLICT",
        "We couldn't cancel your subscription, so your account wasn't deleted. Please try again in a moment or contact support.",
        409,
      );
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      logger.error("settings.delete_account_failed", { userId: user.id, code: error.code, status: error.status });
      throw new AppError("CONFLICT", "We couldn't delete your account right now. Please try again or contact support.", 409);
    }
    // Safety net: the profile (and everything that cascades from it) must be gone even if the auth cascade isn't installed.
    await db().delete(profiles).where(eq(profiles.id, user.id));
    logger.info("settings.account_deleted", { userId: user.id });

    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch (signOutError) {
      logger.warn("settings.delete_account_signout_failed", { error: (signOutError as Error).message });
    }
    // The user no longer exists; make sure no auth cookie survives either way.
    const store = await cookies();
    for (const cookie of store.getAll()) {
      if (cookie.name.startsWith("sb-")) store.delete(cookie.name);
    }
    return null;
  }, "settings.deleteAccount");

  if (!result.ok) return result;
  redirect("/?account_deleted=1");
}
