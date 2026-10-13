import type { Metadata } from "next";

import { AuthNotConfigured } from "@/components/auth/auth-not-configured";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authErrorMessage, firstParam, safeNextPath } from "@/schemas/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to monitor how AI assistants like ChatGPT, Gemini and Perplexity mention your business.",
  alternates: { canonical: "/login" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeNextPath(firstParam(params.next));
  const signedOut = firstParam(params.signed_out) === "1";
  const errorMessage = authErrorMessage(firstParam(params.error));

  const notice = (
    <>
      {!isSupabaseConfigured && <AuthNotConfigured />}
      {signedOut && !errorMessage && (
        <Alert variant="success" className="mb-6">
          You have been signed out.
        </Alert>
      )}
      {errorMessage && (
        <Alert variant="danger" className="mb-6">
          {errorMessage}
        </Alert>
      )}
    </>
  );

  return <LoginForm next={next} disabled={!isSupabaseConfigured} notice={notice} />;
}
