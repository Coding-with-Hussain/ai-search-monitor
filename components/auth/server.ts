import "server-only";

import { createHash } from "node:crypto";

import {
  type AuthError,
  isAuthApiError,
  isAuthError,
  isAuthPKCECodeVerifierMissingError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  isAuthWeakPasswordError,
  type User,
} from "@supabase/supabase-js";
import { headers } from "next/headers";

import { ensureUserRecords } from "@/db/repositories/profiles";
import { appUrl } from "@/lib/env";
import { AppError, notConfigured, validationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AuthErrorCode } from "@/schemas/auth";

/**
 * Server-only helpers shared by the auth server actions (app/actions/auth.ts)
 * and the auth route handlers (app/auth/callback, app/auth/confirm).
 */

/** Reason codes the auth forms use to offer a contextual next step. */
export type AuthFailureReason =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_exists"
  | "weak_password"
  | "same_password"
  | "session_missing"
  | "reauthentication_needed"
  | "rate_limited"
  | "disabled"
  | "email_not_allowed"
  | "unavailable";

export const AUTH_NOT_CONFIGURED_MESSAGE =
  "Authentication isn't configured yet, so this can't be completed right now. Please try again later.";

export function assertAuthConfigured() {
  if (!isSupabaseConfigured) throw notConfigured(AUTH_NOT_CONFIGURED_MESSAGE);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * SHA-256 of the client IP (first `x-forwarded-for` hop, else `x-real-ip`).
 * Raw IPs are never stored or logged.
 */
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip")?.trim() || "unknown";
  return sha256(`aivm:auth-ip:${ip}`);
}

/**
 * Per-IP rate limit for an auth operation. For operations that send email,
 * pass the address too so a single inbox can't be flooded from many IPs.
 */
export async function enforceAuthRateLimit(operation: string, email?: string) {
  const { limit, windowSeconds } = RATE_LIMITS.authAttempt;
  const message = "Too many attempts. Please wait a few minutes and try again.";
  await enforceRateLimit(`auth:${operation}:ip:${await clientIpHash()}`, limit, windowSeconds, message);
  if (email) {
    await enforceRateLimit(`auth:${operation}:email:${sha256(`aivm:auth-email:${email}`)}`, limit, windowSeconds, message);
  }
}

/** Absolute URL of the PKCE callback that finishes an email-link flow. */
export function authCallbackUrl(next: string) {
  return appUrl(`/auth/callback?next=${encodeURIComponent(next)}`);
}

function fullNameOf(user: User): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return typeof meta.full_name === "string" && meta.full_name.trim() ? meta.full_name.trim() : null;
}

/**
 * Make sure profile + subscription rows exist for a freshly signed-in user.
 * The database trigger normally creates them; this is a safety net. Failures
 * are logged but never block sign-in (the app layout retries on every load).
 */
export async function ensureRecordsForAuthUser(user: User) {
  try {
    await ensureUserRecords({ id: user.id, email: user.email ?? "", fullName: fullNameOf(user) });
  } catch (error) {
    logger.error("auth.ensure_records_failed", { userId: user.id, error: (error as Error).message });
  }
}

function authFailure(code: AppError["code"], message: string, status: number, reason: AuthFailureReason) {
  return new AppError(code, message, status, { reason });
}

/**
 * Translate a Supabase Auth error into a friendly, typed AppError. Raw
 * provider messages are never shown to users (they are logged instead).
 */
export function toFriendlyAuthError(error: unknown, operation: string): AppError {
  if (!isAuthError(error)) {
    logger.error(`auth.${operation}.unexpected`, { error: (error as Error)?.message });
    return authFailure("NOT_CONFIGURED", "We couldn't reach the sign-in service. Please try again in a moment.", 503, "unavailable");
  }
  const authError = error as AuthError;
  const code = authError.code;
  logger.warn(`auth.${operation}.failed`, { code, status: authError.status, name: authError.name });

  if (isAuthWeakPasswordError(authError)) {
    const pwned = authError.reasons?.includes("pwned");
    return authFailure(
      "VALIDATION",
      pwned
        ? "This password has appeared in a known data breach. Please choose a different one."
        : "That password is too weak. Use at least 8 characters with a mix of letters, numbers and symbols.",
      400,
      "weak_password",
    );
  }
  if (isAuthSessionMissingError(authError) || code === "session_not_found" || code === "session_expired") {
    return authFailure("UNAUTHORIZED", "Your session has expired. Please request a new link and try again.", 401, "session_missing");
  }
  if (isAuthRetryableFetchError(authError)) {
    return authFailure("NOT_CONFIGURED", "We couldn't reach the sign-in service. Please try again in a moment.", 503, "unavailable");
  }

  switch (code) {
    case "invalid_credentials":
      return authFailure("VALIDATION", "Incorrect email or password.", 400, "invalid_credentials");
    case "email_not_confirmed":
      return authFailure(
        "FORBIDDEN",
        "Please confirm your email address first. Check your inbox for the confirmation link.",
        403,
        "email_not_confirmed",
      );
    case "user_already_exists":
    case "email_exists":
    case "identity_already_exists":
      return authFailure(
        "CONFLICT",
        "An account with this email already exists. Sign in instead, or reset your password if you've forgotten it.",
        409,
        "user_exists",
      );
    case "same_password":
      return authFailure("VALIDATION", "Your new password must be different from your current one.", 400, "same_password");
    case "reauthentication_needed":
    case "reauthentication_not_valid":
      return authFailure(
        "FORBIDDEN",
        "For your security, please request a new password reset link and try again.",
        403,
        "reauthentication_needed",
      );
    case "over_request_rate_limit":
      return authFailure("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.", 429, "rate_limited");
    case "over_email_send_rate_limit":
      return authFailure(
        "RATE_LIMITED",
        "We've sent several emails recently. Please wait a few minutes before requesting another.",
        429,
        "rate_limited",
      );
    case "signup_disabled":
      return authFailure("FORBIDDEN", "New sign-ups are currently closed.", 403, "disabled");
    case "email_provider_disabled":
    case "otp_disabled":
      return authFailure("FORBIDDEN", "Email sign-in is currently unavailable. Please use your password instead.", 403, "disabled");
    case "email_address_invalid":
      return authFailure("VALIDATION", "Enter a valid email address.", 400, "email_not_allowed");
    case "email_address_not_authorized":
      return authFailure(
        "FORBIDDEN",
        "We can't send email to this address right now. Please contact support.",
        403,
        "email_not_allowed",
      );
    case "user_banned":
      return authFailure("FORBIDDEN", "This account has been suspended. Please contact support.", 403, "disabled");
    case "validation_failed":
      return validationError("Please check the details you entered and try again.");
  }

  if (authError.status === 429) {
    return authFailure("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.", 429, "rate_limited");
  }
  if (isAuthApiError(authError) && authError.status === 400 && /invalid login credentials/i.test(authError.message)) {
    // Older GoTrue versions omit the error code.
    return authFailure("VALIDATION", "Incorrect email or password.", 400, "invalid_credentials");
  }
  return authFailure("NOT_CONFIGURED", "We couldn't complete that request right now. Please try again in a moment.", 503, "unavailable");
}

/** Map a callback / verify failure to a short `?error=` code. */
export function callbackErrorCode(error: unknown): AuthErrorCode {
  if (isAuthPKCECodeVerifierMissingError(error)) return "different_browser";
  if (isAuthError(error)) {
    const code = error.code ?? "";
    if (["otp_expired", "flow_state_expired", "flow_state_not_found", "bad_code_verifier"].includes(code)) return "link_expired";
    if (code === "bad_jwt" || code === "session_expired") return "session_expired";
    if (error.status === 403 || error.status === 401) return "link_expired";
    if (error.status === 400 || error.status === 404 || error.status === 422) return "link_invalid";
  }
  return "auth_failed";
}

/** Map the `error` / `error_code` query params GoTrue appends on failed redirects. */
export function providerRedirectErrorCode(error: string | null, errorCode: string | null): AuthErrorCode {
  if (errorCode === "otp_expired" || errorCode === "flow_state_expired") return "link_expired";
  if (error === "access_denied") return errorCode ? "link_invalid" : "access_denied";
  return "auth_failed";
}
