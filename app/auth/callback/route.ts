import { type NextRequest, NextResponse } from "next/server";

import {
  callbackErrorCode,
  ensureRecordsForAuthUser,
  providerRedirectErrorCode,
} from "@/components/auth/server";
import { logger } from "@/lib/logger";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type AuthErrorCode, DEFAULT_AFTER_LOGIN, safeNextPath } from "@/schemas/auth";

/**
 * GET /auth/callback?code=…&next=/path
 *
 * Finishes PKCE email-link flows (signup confirmation, magic link, password
 * recovery) and OAuth sign-ins: exchanges the one-time code for a session
 * (cookies are written to this response), makes sure the user's records
 * exist, then redirects to the sanitised `next` path. Failures redirect to an
 * auth page with a short `?error=` code the page maps to a friendly message.
 */

const AUTH_CODE_PATTERN = /^[\w-]{6,512}$/;

function redirectTo(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"));
  const isRecovery = next === "/reset-password" || next.startsWith("/reset-password?");

  const fail = (code: AuthErrorCode) => {
    if (isRecovery) return redirectTo(request, `/forgot-password?error=${code}`);
    const keepNext = next !== DEFAULT_AFTER_LOGIN ? `&next=${encodeURIComponent(next)}` : "";
    return redirectTo(request, `/login?error=${code}${keepNext}`);
  };

  if (!isSupabaseConfigured) return fail("not_configured");

  const providerError = params.get("error");
  const providerErrorCode = params.get("error_code");
  if (providerError || providerErrorCode) {
    logger.info("auth.callback.provider_error", { error: providerError, errorCode: providerErrorCode });
    return fail(providerRedirectErrorCode(providerError, providerErrorCode));
  }

  const code = params.get("code");
  if (!code || !AUTH_CODE_PATTERN.test(code)) return fail("link_invalid");
  const flowId = params.get("sb_flow_id");

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId && AUTH_CODE_PATTERN.test(flowId) ? { flowId } : undefined,
    );
    if (error || !data.user) {
      logger.warn("auth.callback.exchange_failed", { code: error?.code, status: error?.status, name: error?.name });
      return fail(callbackErrorCode(error));
    }
    await ensureRecordsForAuthUser(data.user);
    return redirectTo(request, next);
  } catch (error) {
    logger.error("auth.callback.failed", { error: (error as Error)?.message });
    return fail(callbackErrorCode(error));
  }
}
