"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";

import {
  assertAuthConfigured,
  authCallbackUrl,
  enforceAuthRateLimit,
  ensureRecordsForAuthUser,
  toFriendlyAuthError,
} from "@/components/auth/server";
import { runAction } from "@/lib/action-utils";
import { track } from "@/lib/analytics/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  emailOnlySchema,
  type EmailOnlyInput,
  loginSchema,
  type LoginInput,
  magicLinkSchema,
  type MagicLinkInput,
  parsePlanIntent,
  resetPasswordSchema,
  type ResetPasswordInput,
  safeNextPath,
  signupSchema,
  type SignupInput,
} from "@/schemas/auth";

/**
 * Auth server actions. They run on the server with the request-bound Supabase
 * client, so session cookies are written to the action's response. Inputs are
 * re-validated here; Supabase errors are mapped to friendly messages; every
 * action is rate limited per client IP (hashed — raw IPs are never stored).
 *
 * Success paths that start a session call `redirect()`, which runAction
 * re-throws so Next.js performs the navigation.
 */

/** Errors that are safe to surface from email-sending flows without revealing whether an account exists. */
function isOperationalFailure(error: AppError) {
  const reason = error.details?.reason;
  return reason === "rate_limited" || reason === "unavailable";
}

export async function loginAction(input: LoginInput): Promise<ActionResult<null>> {
  return runAction(async () => {
    assertAuthConfigured();
    const { email, password, next } = loginSchema.parse(input);
    await enforceAuthRateLimit("login");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw toFriendlyAuthError(error, "login");

    await ensureRecordsForAuthUser(data.user);
    redirect(safeNextPath(next));
  }, "auth.login");
}

export async function magicLinkAction(input: MagicLinkInput): Promise<ActionResult<{ email: string }>> {
  return runAction(async () => {
    assertAuthConfigured();
    const { email, next } = magicLinkSchema.parse(input);
    await enforceAuthRateLimit("magic_link", email);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: authCallbackUrl(safeNextPath(next)) },
    });
    if (error) {
      const friendly = toFriendlyAuthError(error, "magic_link");
      // Unknown addresses get the same response as known ones (no account enumeration).
      if (isOperationalFailure(friendly)) throw friendly;
    }
    return { email };
  }, "auth.magic_link");
}

export type SignupResult = { status: "confirm_email"; email: string };

export async function signupAction(input: SignupInput): Promise<ActionResult<SignupResult>> {
  return runAction(async () => {
    assertAuthConfigured();
    const { fullName, email, password, plan, interval } = signupSchema.parse(input);
    await enforceAuthRateLimit("signup", email);
    const intent = parsePlanIntent(plan, interval);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          // Intent only (helps onboarding/billing suggest the plan) — never treated as billing state.
          ...(intent ? { signup_plan: intent.plan.id, signup_interval: intent.interval } : {}),
        },
        emailRedirectTo: authCallbackUrl("/onboarding"),
      },
    });
    if (error) throw toFriendlyAuthError(error, "signup");
    const user = data.user;
    if (!user) throw toFriendlyAuthError(null, "signup");

    // With email confirmation on, Supabase hides existing accounts by returning
    // a user without identities (and sends no email). Show the same "check your
    // email" state so the response doesn't reveal which addresses are registered.
    const alreadyRegistered = Array.isArray(user.identities) && user.identities.length === 0;
    const analyticsProps = {
      method: "password",
      email_confirmation_required: !data.session,
      plan_intent: intent?.plan.id ?? null,
      interval_intent: intent?.interval ?? null,
    };

    if (data.session) {
      await ensureRecordsForAuthUser(user);
      after(() => track("signup_completed", user.id, analyticsProps));
      redirect("/onboarding");
    }

    if (!alreadyRegistered) after(() => track("signup_completed", user.id, analyticsProps));
    return { status: "confirm_email", email } satisfies SignupResult;
  }, "auth.signup");
}

export async function resendConfirmationAction(input: EmailOnlyInput): Promise<ActionResult<{ email: string }>> {
  return runAction(async () => {
    assertAuthConfigured();
    const { email } = emailOnlySchema.parse(input);
    await enforceAuthRateLimit("resend_confirmation", email);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: authCallbackUrl("/onboarding") },
    });
    if (error) {
      const friendly = toFriendlyAuthError(error, "resend_confirmation");
      if (isOperationalFailure(friendly)) throw friendly;
    }
    return { email };
  }, "auth.resend_confirmation");
}

export async function forgotPasswordAction(input: EmailOnlyInput): Promise<ActionResult<{ email: string }>> {
  return runAction(async () => {
    assertAuthConfigured();
    const { email } = emailOnlySchema.parse(input);
    await enforceAuthRateLimit("password_recovery", email);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl("/reset-password"),
    });
    // Always respond the same way so the form never reveals whether an
    // account exists. Failures are logged by toFriendlyAuthError.
    if (error) toFriendlyAuthError(error, "password_recovery");
    return { email };
  }, "auth.password_recovery");
}

export async function updatePasswordAction(input: ResetPasswordInput): Promise<ActionResult<null>> {
  return runAction(async () => {
    assertAuthConfigured();
    const { password } = resetPasswordSchema.parse(input);
    await enforceAuthRateLimit("update_password");

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new AppError("UNAUTHORIZED", "Your reset link has expired. Request a new one to choose a password.", 401, {
        reason: "session_missing",
      });
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw toFriendlyAuthError(error, "update_password");
    return null;
  }, "auth.update_password");
}
