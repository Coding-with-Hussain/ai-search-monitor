"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import type * as React from "react";
import { useForm } from "react-hook-form";

import { forgotPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emailOnlySchema } from "@/schemas/auth";

import { AuthCard, authLinkClass } from "./auth-card";
import { CheckEmail } from "./check-email";
import { FormAlert } from "./form-alert";
import { fieldAria, FormField } from "./form-field";
import { applyFieldErrors, useAuthAction } from "./use-auth-action";

/**
 * Request a password-reset email. The result screen is identical whether or
 * not an account exists for the address.
 */
export function ForgotPasswordForm({ disabled = false, notice }: { disabled?: boolean; notice?: React.ReactNode }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [lastEmail, setLastEmail] = useState("");

  const footer = (
    <>
      Remembered it?{" "}
      <Link href="/login" className={authLinkClass}>
        Back to sign in
      </Link>
    </>
  );

  if (sentTo) {
    return (
      <CheckEmail
        description={
          <>
            If an account exists for <strong className="font-medium text-foreground">{sentTo}</strong>, you&apos;ll get
            an email with a link to choose a new password. Open it in this browser to continue.
          </>
        }
        onResend={() => forgotPasswordAction({ email: sentTo })}
        resendLabel="Resend link"
        onStartOver={() => setSentTo(null)}
        startOverLabel="Try a different email"
        footer={footer}
      />
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email you use for AI Visibility and we'll send you a link to choose a new password."
      footer={footer}
    >
      {notice}
      <RequestForm
        disabled={disabled}
        defaultEmail={lastEmail}
        onSent={(email) => {
          setLastEmail(email);
          setSentTo(email);
        }}
      />
    </AuthCard>
  );
}

function RequestForm({
  disabled,
  defaultEmail,
  onSent,
}: {
  disabled: boolean;
  defaultEmail: string;
  onSent: (email: string) => void;
}) {
  const form = useForm({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: defaultEmail },
    mode: "onTouched",
  });
  const {
    register,
    formState: { errors },
  } = form;
  const request = useAuthAction(forgotPasswordAction);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await request.run(values);
    if (result.ok) onSent(result.data.email);
    else applyFieldErrors(result.fieldErrors, ["email"] as const, form.setError);
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Request a password reset link">
      <FormAlert error={request.error} />
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
        <FormField id="forgot-email" label="Email" error={errors.email?.message}>
          <Input
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@company.com"
            {...fieldAria("forgot-email", errors.email?.message)}
            {...register("email")}
          />
        </FormField>
        <Button type="submit" size="lg" className="mt-2 w-full" loading={request.pending}>
          {request.pending ? "Sending link…" : "Send reset link"}
        </Button>
      </fieldset>
    </form>
  );
}
