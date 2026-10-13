"use client";

import type { Provider } from "@supabase/supabase-js";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Social sign-in, driven by OAUTH_PROVIDERS. Empty by default, so nothing
 * renders until a provider is configured.
 *
 * To enable Google or GitHub:
 *   1. Supabase Dashboard → Authentication → Sign In / Providers: enable the
 *      provider and paste its OAuth client ID + secret (create them in the
 *      Google Cloud console / GitHub Developer settings, using the callback
 *      URL Supabase shows you).
 *   2. Supabase Dashboard → Authentication → URL Configuration: add
 *      `<NEXT_PUBLIC_APP_URL>/auth/callback` to the Redirect URLs.
 *   3. Add the provider below, e.g. `{ id: "google", label: "Google" }`.
 * The PKCE code returned by the provider is exchanged in app/auth/callback.
 */
export interface OAuthProviderConfig {
  id: Provider;
  label: string;
  /** Optional space-separated scopes requested from the provider. */
  scopes?: string;
}

export const OAUTH_PROVIDERS: readonly OAuthProviderConfig[] = [];

export function OAuthButtons({ next, disabled = false }: { next: string; disabled?: boolean }) {
  const [pendingId, setPendingId] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (OAUTH_PROVIDERS.length === 0) return null;

  async function signIn(provider: OAuthProviderConfig) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Sign-in isn't configured yet.");
      return;
    }
    setError(null);
    setPendingId(provider.id);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: provider.id,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        scopes: provider.scopes,
      },
    });
    // On success the browser is already navigating to the provider.
    if (oauthError) {
      setPendingId(null);
      setError(`We couldn't start ${provider.label} sign-in. Please try again or use your email.`);
    }
  }

  return (
    <div className="mb-6">
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        {OAUTH_PROVIDERS.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            loading={pendingId === provider.id}
            disabled={disabled || (pendingId !== null && pendingId !== provider.id)}
            onClick={() => signIn(provider)}
          >
            Continue with {provider.label}
          </Button>
        ))}
      </div>
      <div className="relative mt-6 flex items-center" role="separator" aria-label="or continue with email">
        <span className="h-px flex-1 bg-border" />
        <span className="px-3 text-xs text-subtle-foreground" aria-hidden="true">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
