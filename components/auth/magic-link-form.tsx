"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { magicLinkAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { magicLinkSchema } from "@/schemas/auth";

import { FormAlert } from "./form-alert";
import { fieldAria, FormField } from "./form-field";
import { applyFieldErrors, useAuthAction } from "./use-auth-action";

/** Passwordless sign-in for existing accounts (Supabase magic link). */
export function MagicLinkForm({
  next,
  disabled,
  initialEmail,
  onEmailChange,
  onSent,
}: {
  next: string;
  disabled: boolean;
  initialEmail: string;
  onEmailChange: (email: string) => void;
  onSent: (email: string) => void;
}) {
  const form = useForm({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: initialEmail },
    mode: "onTouched",
  });
  const {
    register,
    formState: { errors },
  } = form;
  const send = useAuthAction(magicLinkAction);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await send.run({ ...values, next });
    if (result.ok) onSent(result.data.email);
    else applyFieldErrors(result.fieldErrors, ["email"] as const, form.setError);
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Sign in with an email link">
      <FormAlert error={send.error} />
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
        <FormField
          id="magic-email"
          label="Email"
          error={errors.email?.message}
          hint="We'll email you a one-time sign-in link — no password needed."
        >
          <Input
            id="magic-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@company.com"
            {...fieldAria("magic-email", errors.email?.message, true)}
            {...register("email", { onChange: (e) => onEmailChange(e.target.value) })}
          />
        </FormField>
        <Button type="submit" size="lg" className="mt-2 w-full" loading={send.pending}>
          {send.pending ? "Sending link…" : "Email me a sign-in link"}
        </Button>
      </fieldset>
    </form>
  );
}
