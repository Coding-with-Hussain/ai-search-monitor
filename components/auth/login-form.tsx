"use client";

import Link from "next/link";
import { useState } from "react";
import type * as React from "react";

import { magicLinkAction } from "@/app/actions/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AuthCard, authLinkClass } from "./auth-card";
import { CheckEmail } from "./check-email";
import { MagicLinkForm } from "./magic-link-form";
import { OAuthButtons } from "./oauth-buttons";
import { PasswordLoginForm } from "./password-login-form";

type Mode = "password" | "link";

/**
 * Sign-in card: email + password by default, with a passwordless email-link
 * mode as a secondary tab. The typed email carries over between modes.
 */
export function LoginForm({
  next,
  disabled = false,
  notice,
}: {
  /** Already-sanitised post-login destination. */
  next: string;
  disabled?: boolean;
  /** Messages rendered above the form (signed out, link errors, configuration). */
  notice?: React.ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const footer = (
    <>
      New to AI Visibility?{" "}
      <Link href="/signup" className={authLinkClass}>
        Create an account
      </Link>
    </>
  );

  if (sentTo) {
    return (
      <CheckEmail
        description={
          <>
            If an account exists for <strong className="font-medium text-foreground">{sentTo}</strong>, we&apos;ve sent a
            sign-in link. Open it in this browser to continue.
          </>
        }
        onResend={() => magicLinkAction({ email: sentTo, next })}
        resendLabel="Resend link"
        onStartOver={() => setSentTo(null)}
        startOverLabel="Back to sign in"
        footer={footer}
      />
    );
  }

  return (
    <AuthCard title="Welcome back" description="Sign in to see how AI assistants mention your business." footer={footer}>
      {notice}
      <OAuthButtons next={next} disabled={disabled} />
      <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
        <TabsList className="mb-6 grid w-full grid-cols-2" aria-label="Sign-in method">
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="link">Email link</TabsTrigger>
        </TabsList>
        <TabsContent value="password" className="mt-0">
          <PasswordLoginForm next={next} disabled={disabled} initialEmail={email} onEmailChange={setEmail} />
        </TabsContent>
        <TabsContent value="link" className="mt-0">
          <MagicLinkForm
            next={next}
            disabled={disabled}
            initialEmail={email}
            onEmailChange={setEmail}
            onSent={(address) => {
              setEmail(address);
              setSentTo(address);
            }}
          />
        </TabsContent>
      </Tabs>
    </AuthCard>
  );
}
