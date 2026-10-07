import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { unauthorized } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
}

/**
 * The verified current user, or null. Uses `auth.getUser()`, which validates
 * the session with Supabase Auth (never trust an unverified cookie).
 * Memoized per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    return {
      id: user.id,
      email: user.email ?? "",
      fullName: typeof meta.full_name === "string" ? meta.full_name : null,
    };
  } catch (error) {
    logger.warn("auth.get_user_failed", { error: (error as Error).message });
    return null;
  }
});

/** For pages/layouts: redirect to /login when signed out. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  return user;
}

/** For server actions / route handlers: throw a typed 401 when signed out. */
export async function requireUserOrThrow(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}
