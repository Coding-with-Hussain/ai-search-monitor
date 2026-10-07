import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { notConfigured } from "@/lib/errors";

import { supabaseUrl } from "./config";

/**
 * Service-role client. Bypasses RLS and can manage auth users — only use it
 * on the server for privileged operations (e.g. deleting an account).
 */
export function createSupabaseAdminClient() {
  const key = env().SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) {
    throw notConfigured("SUPABASE_SERVICE_ROLE_KEY is required for this operation.");
  }
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
