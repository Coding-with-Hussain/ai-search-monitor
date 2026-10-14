"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useId } from "react";
import { Controller, type FieldPath, useForm } from "react-hook-form";

import { updateMonitoringDefaultsAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useServerAction } from "@/hooks/use-server-action";
import { PROVIDER_META } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import { type MonitoringFrequency, PROVIDER_IDS, type ProviderId } from "@/types/domain";

import {
  MAX_DEFAULT_QUERIES,
  MIN_DEFAULT_QUERIES,
  type MonitoringDefaultsInput,
  monitoringDefaultsSchema,
  type MonitoringDefaultsValues,
} from "./schemas";
import { fieldAria, SettingsField, SettingsSection } from "./settings-section";

const FREQUENCY_LABEL: Record<MonitoringFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  manual: "Manual only",
};

export interface DefaultFrequencyOption {
  value: MonitoringFrequency;
  allowed: boolean;
  /** Plans that include it when not allowed, e.g. "Pro and Agency". */
  availableOn?: string;
}

const FIELDS = new Set(["frequency", "queryCount", "providers"]);

/** Defaults the onboarding wizard starts from when you add a new project. */
export function MonitoringDefaultsForm({
  defaults,
  frequencyOptions,
  planName,
}: {
  defaults: MonitoringDefaultsInput;
  frequencyOptions: DefaultFrequencyOption[];
  planName: string;
}) {
  const id = useId();
  const form = useForm<MonitoringDefaultsInput, unknown, MonitoringDefaultsValues>({
    resolver: zodResolver(monitoringDefaultsSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const {
    register,
    control,
    formState: { errors, isDirty },
  } = form;

  const { execute, pending } = useServerAction(updateMonitoringDefaultsAction, {
    successMessage: "Monitoring defaults saved",
    onSuccess: (data) => form.reset(data),
    onError: (result) => {
      for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
        const root = key.split(".")[0];
        if (FIELDS.has(root) && messages[0]) {
          form.setError(root as FieldPath<MonitoringDefaultsInput>, { type: "server", message: messages[0] });
        }
      }
    },
  });

  const onSubmit = form.handleSubmit((values) => execute(values));
  const frequencyId = `${id}-frequency`;
  const countId = `${id}-count`;
  const providersId = `${id}-providers`;
  const locked = frequencyOptions.filter((o) => !o.allowed);

  return (
    <form onSubmit={onSubmit} noValidate>
      <SettingsSection
        id="monitoring"
        title="Monitoring defaults"
        description="The starting point when you add a new project. Existing projects keep their own settings."
        footer={
          <Button type="submit" loading={pending} disabled={!isDirty || pending}>
            Save defaults
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <SettingsField
              id={frequencyId}
              label="Monitoring frequency"
              error={errors.frequency?.message}
              hint={
                locked.length > 0 ? (
                  <>
                    {locked.map((o) => `${FREQUENCY_LABEL[o.value]} monitoring is available on ${o.availableOn ?? "higher plans"}`).join(". ")}
                    .{" "}
                    <Link href="/billing#plans" className="font-medium text-foreground underline underline-offset-2">
                      Compare plans
                    </Link>
                  </>
                ) : (
                  `All frequencies are included in your ${planName} plan.`
                )
              }
            >
              <NativeSelect id={frequencyId} {...register("frequency")} {...fieldAria(frequencyId, errors.frequency?.message, true)}>
                {frequencyOptions.map((o) => (
                  <option key={o.value} value={o.value} disabled={!o.allowed}>
                    {FREQUENCY_LABEL[o.value]}
                    {o.allowed ? "" : ` — ${o.availableOn ?? "upgrade"}`}
                  </option>
                ))}
              </NativeSelect>
            </SettingsField>

            <SettingsField
              id={countId}
              label="Questions to monitor"
              error={errors.queryCount?.message}
              hint={`Between ${MIN_DEFAULT_QUERIES} and ${MAX_DEFAULT_QUERIES}. Each question checked in a scan uses one query from your monthly allowance.`}
            >
              <Input
                id={countId}
                type="number"
                inputMode="numeric"
                min={MIN_DEFAULT_QUERIES}
                max={MAX_DEFAULT_QUERIES}
                step={1}
                className="sm:max-w-40"
                {...register("queryCount", { valueAsNumber: true })}
                {...fieldAria(countId, errors.queryCount?.message, true)}
              />
            </SettingsField>
          </div>

          <fieldset aria-describedby={errors.providers?.message ? `${providersId}-error` : undefined}>
            <legend className="text-[13px] font-medium text-foreground">AI platforms</legend>
            <Controller
              control={control}
              name="providers"
              render={({ field }) => {
                const selected = new Set<ProviderId>(field.value ?? []);
                const set = (provider: ProviderId, on: boolean) => {
                  const next = new Set(selected);
                  if (on) next.add(provider);
                  else next.delete(provider);
                  field.onChange(PROVIDER_IDS.filter((p) => next.has(p)));
                };
                return (
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                    {PROVIDER_IDS.map((provider) => {
                      const checkboxId = `${providersId}-${provider}`;
                      const checked = selected.has(provider);
                      return (
                        <label
                          key={provider}
                          htmlFor={checkboxId}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                            checked ? "border-primary/40 bg-primary-soft/50" : "border-border hover:bg-surface-muted",
                          )}
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={checked}
                            onCheckedChange={(value) => set(provider, value === true)}
                            onBlur={field.onBlur}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-foreground">{PROVIDER_META[provider].name}</span>
                            <span className="block text-xs text-muted-foreground">{PROVIDER_META[provider].vendor}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                );
              }}
            />
            {errors.providers?.message && (
              <p id={`${providersId}-error`} className="mt-2 text-[13px] text-danger-text">
                {errors.providers.message}
              </p>
            )}
          </fieldset>
        </div>
      </SettingsSection>
    </form>
  );
}
