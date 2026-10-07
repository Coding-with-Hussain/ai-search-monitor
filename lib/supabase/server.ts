import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { notConfigured } from "@/lib/errors";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

/**
 * Supabase client bound to the current request's cookies. Use in Server
 * Components, Server Actions and Route Handlers. In Server Components cookie
 * writes are ignored (the proxy refreshes the session instead).
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured) {
    throw notConfigured(
      "Authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: safe to ignore because the proxy
          // refreshes sessions on every request.
        }
      },
    },
  });
}
