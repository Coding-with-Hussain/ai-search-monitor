import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard, authLinkClass } from "@/components/auth/auth-card";
import { AuthNotConfigured } from "@/components/auth/auth-not-configured";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

/**
 * Reached from a password-recovery email (via /auth/callback or
 * /auth/confirm, which establish a recovery session). Without a verified
 * session there is nothing to update, so explain how to get a fresh link.
 */
export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured) {
    return (
      <AuthCard title="Choose a new password">
        <AuthNotConfigured />
      </AuthCard>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <AuthCard
        icon={KeyRound}
        title="Open your reset link"
        description="To choose a new password, open the reset link from your email in this browser. Reset links work once and expire after a while, so you may need a new one."
        footer={
          <Link href="/login" className={authLinkClass}>
            Back to sign in
          </Link>
        }
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">Request a new reset link</Link>
        </Button>
      </AuthCard>
    );
  }

  return <ResetPasswordForm email={user.email} />;
}
