"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { loginAction, resendConfirmationAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema } from "@/schemas/auth";

import { authLinkClass } from "./auth-card";
import { FormAlert } from "./form-alert";
import { fieldAria, FormField } from "./form-field";
import { PasswordInput } from "./password-input";
import { applyFieldErrors, useAuthAction } from "./use-auth-action";

export function PasswordLoginForm({
  next,
  disabled,
  initialEmail,
  onEmailChange,
}: {
  next: string;
  disabled: boolean;
  initialEmail: string;
  onEmailChange: (email: string) => void;
}) {
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: initialEmail, password: "" },
    mode: "onTouched",
  });
  const {
    register,
    formState: { errors },
  } = form;
  const login = useAuthAction(loginAction);
  const resend = useAuthAction(resendConfirmationAction);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await login.run({ ...values, next });
    if (!result.ok) applyFieldErrors(result.fieldErrors, ["email", "password"] as const, form.setError);
  });

  async function resendConfirmation() {
    const result = await resend.run({ email: form.getValues("email") });
    if (result.ok) {
      login.clearError();
      toast.success("Confirmation email sent", { description: `Open the link we sent to ${result.data.email} to activate your account.` });
    }
  }

  const reason = login.error?.reason;

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Sign in with password">
      <FormAlert error={resend.error ?? login.error}>
        {reason === "email_not_confirmed" && !resend.error && (
          <Button type="button" variant="link" size="sm" onClick={resendConfirmation} loading={resend.pending}>
            Resend confirmation email
          </Button>
        )}
        {reason === "invalid_credentials" && (
          <Link href="/forgot-password" className={`text-[13px] ${authLinkClass}`}>
            Reset your password
          </Link>
        )}
      </FormAlert>

      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
        <FormField id="login-email" label="Email" error={errors.email?.message}>
          <Input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@company.com"
            {...fieldAria("login-email", errors.email?.message)}
            {...register("email", { onChange: (e) => onEmailChange(e.target.value) })}
          />
        </FormField>

        <FormField
          id="login-password"
          label="Password"
          error={errors.password?.message}
          labelAside={
            <Link href="/forgot-password" className={`text-[13px] ${authLinkClass}`}>
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            {...fieldAria("login-password", errors.password?.message)}
            {...register("password")}
          />
        </FormField>

        <Button type="submit" size="lg" className="mt-2 w-full" loading={login.pending}>
          {login.pending ? "Signing in…" : "Sign in"}
        </Button>
      </fieldset>
    </form>
  );
}
