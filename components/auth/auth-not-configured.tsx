import { Alert } from "@/components/ui/alert";

/** Shown on auth pages when the Supabase public env vars are missing. */
export function AuthNotConfigured() {
  return (
    <Alert variant="warning" title="Authentication isn't configured yet" className="mb-6">
      Set <code className="rounded bg-surface px-1 py-0.5 font-mono text-[12px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code className="rounded bg-surface px-1 py-0.5 font-mono text-[12px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (see{" "}
      <code className="rounded bg-surface px-1 py-0.5 font-mono text-[12px]">.env.example</code>), then restart the app.
      The form below is disabled until then.
    </Alert>
  );
}
