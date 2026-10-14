"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";

import { changePasswordAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useServerAction } from "@/hooks/use-server-action";
import { PASSWORD_MIN_LENGTH } from "@/schemas/auth";

import { type ChangePasswordInput, changePasswordSchema } from "./schemas";
import { fieldAria, SettingsField, SettingsSection } from "./settings-section";

const EMPTY: ChangePasswordInput = { password: "", confirmPassword: "" };

/** Sign-in email (read-only) and password change (works for magic-link accounts too). */
export function AccountSection({ email, supportEmail }: { email: string; supportEmail: string }) {
  const id = useId();
  const [show, setShow] = useState(false);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
    mode: "onTouched",
  });
  const {
    register,
    formState: { errors, isDirty },
  } = form;

  const { execute, pending } = useServerAction(changePasswordAction, {
    successMessage: "Password updated",
    onSuccess: () => {
      form.reset(EMPTY);
      setShow(false);
    },
    onError: (result) => {
      for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
        if ((key === "password" || key === "confirmPassword") && messages[0]) {
          form.setError(key as FieldPath<ChangePasswordInput>, { type: "server", message: messages[0] });
        }
      }
    },
  });

  const onSubmit = form.handleSubmit((values) => execute(values));
  const emailId = `${id}-email`;
  const passwordId = `${id}-password`;
  const confirmId = `${id}-confirm`;

  return (
    <form onSubmit={onSubmit} noValidate>
      <SettingsSection
        id="account"
        title="Account"
        description="Your sign-in email and password."
        footer={
          <Button type="submit" loading={pending} disabled={!isDirty || pending}>
            Update password
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <SettingsField
            id={emailId}
            label="Email"
            hint={
              <>
                Your sign-in address. To change it, email{" "}
                <a href={`mailto:${supportEmail}`} className="font-medium text-foreground underline underline-offset-2">
                  {supportEmail}
                </a>
                .
              </>
            }
          >
            <Input
              id={emailId}
              type="email"
              value={email}
              readOnly
              autoComplete="username"
              className="bg-surface-muted sm:max-w-sm"
              {...fieldAria(emailId, undefined, true)}
            />
          </SettingsField>

          <Separator />

          <div>
            <h3 className="text-sm font-medium">Change password</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Signed in with an email link? You can set a password here to sign in with it next time.
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <SettingsField
                id={passwordId}
                label="New password"
                error={errors.password?.message}
                hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
              >
                <Input
                  id={passwordId}
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("password")}
                  {...fieldAria(passwordId, errors.password?.message, true)}
                />
              </SettingsField>
              <SettingsField id={confirmId} label="Confirm new password" error={errors.confirmPassword?.message}>
                <Input
                  id={confirmId}
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  {...fieldAria(confirmId, errors.confirmPassword?.message)}
                />
              </SettingsField>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3 -ml-2 text-muted-foreground"
              onClick={() => setShow((v) => !v)}
              aria-pressed={show}
            >
              {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              {show ? "Hide passwords" : "Show passwords"}
            </Button>
          </div>
        </div>
      </SettingsSection>
    </form>
  );
}
