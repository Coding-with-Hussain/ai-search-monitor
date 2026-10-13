import type { Metadata } from "next";

import { AuthNotConfigured } from "@/components/auth/auth-not-configured";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Alert } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authErrorMessage, firstParam } from "@/schemas/auth";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a link to choose a new password for your AI Visibility account.",
  alternates: { canonical: "/forgot-password" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // Set by /auth/callback or /auth/confirm when a recovery link fails.
  const errorMessage = authErrorMessage(firstParam(params.error));

  const notice = (
    <>
      {!isSupabaseConfigured && <AuthNotConfigured />}
      {errorMessage && (
        <Alert variant="warning" className="mb-6">
          {errorMessage}
        </Alert>
      )}
    </>
  );

  return <ForgotPasswordForm disabled={!isSupabaseConfigured} notice={notice} />;
}
