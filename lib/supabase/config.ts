/**
 * Public Supabase configuration. These values are safe to expose to the
 * browser (the anon/publishable key is designed for it — RLS protects data).
 * Referenced via `process.env.NEXT_PUBLIC_*` literals so Next.js inlines them.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
