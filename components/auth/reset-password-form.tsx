"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { updatePasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { resetPasswordSchema } from "@/schemas/auth";

import { AuthCard, authLinkClass } from "./auth-card";
import { FormAlert } from "./form-alert";
import { fieldAria, FormField } from "./form-field";
import { PasswordInput } from "./password-input";
import { PasswordStrength } from "./password-strength";
import { applyFieldErrors, useAuthAction } from "./use-auth-action";

const REDIRECT_DELAY_MS = 1500;

/** Choose a new password inside a recovery session, then continue to the dashboard. */
export function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onTouched",
  });
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const password = useWatch({ control, name: "password" }) ?? "";
  const update = useAuthAction(updatePasswordAction);
  const goToDashboard = useCallback(() => router.replace("/dashboard"), [router]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await update.run(values);
    if (result.ok) {
      setDone(true);
      toast.success("Password updated");
    } else {
      applyFieldErrors(result.fieldErrors, ["password", "confirmPassword"] as const, form.setError);
    }
  });

  if (done) return <PasswordUpdated onContinue={goToDashboard} />;

  const reason = update.error?.reason;

  return (
    <AuthCard
      title="Choose a new password"
      description={
        email ? (
          <>
            For <strong className="font-medium text-foreground">{email}</strong>. You&apos;ll stay signed in on this
            device.
          </>
        ) : (
          "You'll stay signed in on this device."
        )
      }
    >
      <form onSubmit={onSubmit} noValidate aria-label="Choose a new password">
        <FormAlert error={update.error}>
          {(reason === "session_missing" || reason === "reauthentication_needed") && (
            <Link href="/forgot-password" className={`text-[13px] ${authLinkClass}`}>
              Request a new reset link
            </Link>
          )}
        </FormAlert>
        {/* Lets password managers associate the new password with the right account. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <div className="flex flex-col gap-4">
          <FormField
            id="reset-password"
            label="New password"
            error={errors.password?.message}
            hint={<PasswordStrength password={password} />}
          >
            <PasswordInput
              id="reset-password"
              autoComplete="new-password"
              {...fieldAria("reset-password", errors.password?.message, true)}
              {...register("password")}
            />
          </FormField>
          <FormField id="reset-confirm" label="Confirm new password" error={errors.confirmPassword?.message}>
            <PasswordInput
              id="reset-confirm"
              autoComplete="new-password"
              {...fieldAria("reset-confirm", errors.confirmPassword?.message)}
              {...register("confirmPassword")}
            />
          </FormField>
          <Button type="submit" size="lg" className="mt-2 w-full" loading={update.pending}>
            {update.pending ? "Updating password…" : "Update password"}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}

function PasswordUpdated({ onContinue }: { onContinue: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const timer = setTimeout(onContinue, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <div ref={ref} tabIndex={-1} className="rounded-xl focus:outline-none">
      <AuthCard
        icon={CircleCheck}
        title="Password updated"
        description="Your new password is saved. Taking you to your dashboard…"
      >
        <Button type="button" size="lg" className="w-full" onClick={onContinue}>
          Go to dashboard
        </Button>
      </AuthCard>
    </div>
  );
}
