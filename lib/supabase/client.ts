"use client";

import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Browser Supabase client (auth only — data access goes through the server). */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  client ??= createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
