import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { callbackErrorCode, ensureRecordsForAuthUser } from "@/components/auth/server";
import { logger } from "@/lib/logger";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type AuthErrorCode, DEFAULT_AFTER_LOGIN, safeNextPath } from "@/schemas/auth";

/**
 * GET /auth/confirm?token_hash=…&type=…&next=/path
 *
 * Token-hash email links (works even when the link is opened in a different
 * browser than the one that requested it). Point the Supabase email templates
 * here, e.g. `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`.
 */

const OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const satisfies readonly EmailOtpType[];

const querySchema = z.object({
  token_hash: z.string().regex(/^[\w-]{6,512}$/),
  type: z.enum(OTP_TYPES),
});

const DEFAULT_NEXT: Record<(typeof OTP_TYPES)[number], string> = {
  signup: "/onboarding",
  invite: "/onboarding",
  magiclink: DEFAULT_AFTER_LOGIN,
  email: DEFAULT_AFTER_LOGIN,
  recovery: "/reset-password",
  email_change: "/settings",
};

function redirectTo(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({ token_hash: params.get("token_hash"), type: params.get("type") });
  const type = parsed.success ? parsed.data.type : null;
  const next = safeNextPath(params.get("next"), type ? DEFAULT_NEXT[type] : DEFAULT_AFTER_LOGIN);

  const fail = (code: AuthErrorCode) =>
    redirectTo(request, type === "recovery" ? `/forgot-password?error=${code}` : `/login?error=${code}`);

  if (!isSupabaseConfigured) return fail("not_configured");
  if (!parsed.success) return fail("link_invalid");

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({ type: parsed.data.type, token_hash: parsed.data.token_hash });
    if (error) {
      logger.warn("auth.confirm.verify_failed", { code: error.code, status: error.status, type: parsed.data.type });
      return fail(callbackErrorCode(error));
    }
    if (data.user) await ensureRecordsForAuthUser(data.user);
    // email_change can succeed without a new session (first of two confirmations).
    if (!data.session && parsed.data.type !== "email_change") return fail("auth_failed");
    return redirectTo(request, next);
  } catch (error) {
    logger.error("auth.confirm.failed", { error: (error as Error)?.message });
    return fail(callbackErrorCode(error));
  }
}
