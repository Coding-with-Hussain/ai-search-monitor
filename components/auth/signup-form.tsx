"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import type * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { resendConfirmationAction, signupAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { signupSchema } from "@/schemas/auth";

import { AuthCard, authLinkClass } from "./auth-card";
import { CheckEmail } from "./check-email";
import { FormAlert } from "./form-alert";
import { FieldError, fieldAria, FormField } from "./form-field";
import { OAuthButtons } from "./oauth-buttons";
import { PasswordInput } from "./password-input";
import { PasswordStrength } from "./password-strength";
import { applyFieldErrors, useAuthAction } from "./use-auth-action";

const SIGNUP_FIELDS = ["fullName", "email", "password", "acceptTerms"] as const;

export function SignupForm({
  plan,
  interval,
  disabled = false,
  notice,
  trialDays,
}: {
  /** Raw plan intent from the URL; re-validated on the server. */
  plan?: string;
  interval?: string;
  disabled?: boolean;
  notice?: React.ReactNode;
  trialDays: number;
}) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [draft, setDraft] = useState({ fullName: "", email: "" });

  const footer = (
    <>
      Already have an account?{" "}
      <Link href="/login" className={authLinkClass}>
        Sign in
      </Link>
    </>
  );

  if (sentTo) {
    return (
      <CheckEmail
        description={
          <>
            We sent a confirmation link to <strong className="font-medium text-foreground">{sentTo}</strong>. Open it
            to activate your account and set up your first project.
            <span className="mt-2 block">If you already have an account with this email, sign in instead.</span>
          </>
        }
        onResend={() => resendConfirmationAction({ email: sentTo })}
        resendLabel="Resend confirmation"
        onStartOver={() => setSentTo(null)}
        footer={footer}
      />
    );
  }

  return (
    <AuthCard
      title="Create your account"
      description={`Start monitoring your AI search visibility. Free for ${trialDays} days — no card required.`}
      footer={footer}
    >
      {notice}
      <OAuthButtons next="/onboarding" disabled={disabled} />
      <SignupFields
        plan={plan}
        interval={interval}
        disabled={disabled}
        defaults={draft}
        onConfirmationRequired={(values) => {
          setDraft(values);
          setSentTo(values.email);
        }}
      />
    </AuthCard>
  );
}

function SignupFields({
  plan,
  interval,
  disabled,
  defaults,
  onConfirmationRequired,
}: {
  plan?: string;
  interval?: string;
  disabled: boolean;
  defaults: { fullName: string; email: string };
  onConfirmationRequired: (values: { fullName: string; email: string }) => void;
}) {
  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: defaults.fullName, email: defaults.email, password: "", acceptTerms: false },
    mode: "onTouched",
  });
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const password = useWatch({ control, name: "password" }) ?? "";
  const signup = useAuthAction(signupAction);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await signup.run({ ...values, plan, interval });
    if (result.ok) {
      onConfirmationRequired({ fullName: values.fullName, email: result.data.email });
    } else {
      applyFieldErrors(result.fieldErrors, SIGNUP_FIELDS, form.setError);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Create your account">
      <FormAlert error={signup.error}>
        {signup.error?.reason === "user_exists" && (
          <>
            <Link href="/login" className={`text-[13px] ${authLinkClass}`}>
              Sign in
            </Link>
            <Link href="/forgot-password" className={`text-[13px] ${authLinkClass}`}>
              Reset your password
            </Link>
          </>
        )}
      </FormAlert>

      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
        <FormField id="signup-name" label="Full name" error={errors.fullName?.message}>
          <Input
            id="signup-name"
            autoComplete="name"
            placeholder="Alex Morgan"
            {...fieldAria("signup-name", errors.fullName?.message)}
            {...register("fullName")}
          />
        </FormField>

        <FormField id="signup-email" label="Work email" error={errors.email?.message}>
          <Input
            id="signup-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@company.com"
            {...fieldAria("signup-email", errors.email?.message)}
            {...register("email")}
          />
        </FormField>

        <FormField
          id="signup-password"
          label="Password"
          error={errors.password?.message}
          hint={<PasswordStrength password={password} />}
        >
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            {...fieldAria("signup-password", errors.password?.message, true)}
            {...register("password")}
          />
        </FormField>

        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2.5">
            <Controller
              control={control}
              name="acceptTerms"
              render={({ field }) => (
                <Checkbox
                  id="signup-terms"
                  ref={field.ref}
                  name={field.name}
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  onBlur={field.onBlur}
                  className="mt-0.5"
                  {...fieldAria("signup-terms", errors.acceptTerms?.message)}
                />
              )}
            />
            <label htmlFor="signup-terms" className="text-[13px] leading-snug text-muted-foreground">
              I agree to the{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className={authLinkClass}>
                Terms of Service
                <span className="sr-only"> (opens in a new tab)</span>
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={authLinkClass}>
                Privacy Policy
                <span className="sr-only"> (opens in a new tab)</span>
              </Link>
              .
            </label>
          </div>
          <FieldError id="signup-terms" message={errors.acceptTerms?.message} />
        </div>

        <Button type="submit" size="lg" className="mt-2 w-full" loading={signup.pending}>
          {signup.pending ? "Creating your account…" : "Create account"}
        </Button>
      </fieldset>
    </form>
  );
}
