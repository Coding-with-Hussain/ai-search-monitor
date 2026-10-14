"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { type FieldPath, useForm } from "react-hook-form";

import { updateProfileAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";

import { type ProfileInput, profileSchema, type ProfileValues } from "./schemas";
import { fieldAria, SettingsField, SettingsSection } from "./settings-section";

/** Full name + company. The company is the brand name on white-label reports (Agency). */
export function ProfileForm({
  defaults,
  whiteLabel,
}: {
  defaults: ProfileInput;
  /** The current plan includes white-label reports. */
  whiteLabel: boolean;
}) {
  const id = useId();
  const form = useForm<ProfileInput, unknown, ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const {
    register,
    formState: { errors, isDirty },
  } = form;

  const { execute, pending } = useServerAction(updateProfileAction, {
    successMessage: "Profile saved",
    onSuccess: (data) => form.reset({ fullName: data.fullName, company: data.company ?? "" }),
    onError: (result) => {
      for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
        if ((key === "fullName" || key === "company") && messages[0]) {
          form.setError(key as FieldPath<ProfileInput>, { type: "server", message: messages[0] });
        }
      }
    },
  });

  const onSubmit = form.handleSubmit(() => execute(form.getValues()));
  const nameId = `${id}-name`;
  const companyId = `${id}-company`;

  return (
    <form onSubmit={onSubmit} noValidate>
      <SettingsSection
        id="profile"
        title="Profile"
        description="How you appear in the app and on the reports you share."
        footer={
          <Button type="submit" loading={pending} disabled={!isDirty || pending}>
            Save profile
          </Button>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SettingsField id={nameId} label="Full name" error={errors.fullName?.message}>
            <Input
              id={nameId}
              autoComplete="name"
              maxLength={100}
              {...register("fullName")}
              {...fieldAria(nameId, errors.fullName?.message)}
            />
          </SettingsField>
          <SettingsField
            id={companyId}
            label="Company"
            optional
            error={errors.company?.message}
            hint={
              whiteLabel
                ? "Used as the brand name on your white-label reports (“Prepared by …”)."
                : "On the Agency plan, this is the brand name shown on white-label reports."
            }
          >
            <Input
              id={companyId}
              autoComplete="organization"
              maxLength={120}
              {...register("company")}
              {...fieldAria(companyId, errors.company?.message, true)}
            />
          </SettingsField>
        </div>
      </SettingsSection>
    </form>
  );
}
