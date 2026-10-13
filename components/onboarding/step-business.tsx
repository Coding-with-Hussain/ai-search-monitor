"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { BUSINESS_TYPE_OPTIONS, COUNTRY_SUGGESTIONS, INDUSTRY_SUGGESTIONS } from "./constants";
import { Field, FieldError, fieldAria } from "./field";
import type { OnboardingInput, OnboardingValues } from "./schema";

export function StepBusiness() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<OnboardingInput, unknown, OnboardingValues>();
  const businessType = useWatch({ control, name: "businessType" });
  const isLocal = businessType === "local";

  return (
    <div className="flex flex-col gap-6">
      <Field id="ob-name" label="Business name" error={errors.name?.message} hint="Use the name customers know you by.">
        <Input
          id="ob-name"
          autoComplete="organization"
          placeholder="e.g. ABC Dental"
          {...fieldAria("ob-name", errors.name?.message, true)}
          {...register("name")}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id="ob-website"
          label="Website"
          optional
          error={errors.website?.message}
          hint="Lets us spot when AI answers cite your site."
        >
          <Input
            id="ob-website"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="example.com"
            {...fieldAria("ob-website", errors.website?.message, true)}
            {...register("website")}
          />
        </Field>

        <Field id="ob-industry" label="Industry" error={errors.industry?.message} hint="Pick a suggestion or type your own.">
          <Input
            id="ob-industry"
            list="ob-industry-options"
            autoComplete="off"
            placeholder="e.g. Dentist, Law firm, CRM software"
            {...fieldAria("ob-industry", errors.industry?.message, true)}
            {...register("industry")}
          />
          <datalist id="ob-industry-options">
            {INDUSTRY_SUGGESTIONS.map((industry) => (
              <option key={industry} value={industry} />
            ))}
          </datalist>
        </Field>
      </div>

      <fieldset className="flex min-w-0 flex-col gap-2" aria-describedby={errors.businessType ? "ob-type-error" : undefined}>
        <legend className="mb-2 text-[13px] font-medium text-foreground">Business type</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {BUSINESS_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = businessType === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "relative flex cursor-pointer items-start gap-3 rounded-xl border bg-surface p-4 transition-colors",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                  selected ? "border-primary bg-primary-soft/50" : "border-border hover:border-border-strong hover:bg-surface-muted/60",
                )}
              >
                <input type="radio" value={option.value} className="sr-only" {...register("businessType")} />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    selected ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{option.label}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{option.description}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-3 right-3 size-4 rounded-full border",
                    selected ? "border-[5px] border-primary bg-surface" : "border-border-strong",
                  )}
                />
              </label>
            );
          })}
        </div>
        <FieldError id="ob-type" message={errors.businessType?.message} />
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="ob-country" label="Country" optional={!isLocal} error={errors.country?.message}>
          <Input
            id="ob-country"
            list="ob-country-options"
            autoComplete="country-name"
            placeholder="e.g. United States"
            {...fieldAria("ob-country", errors.country?.message)}
            {...register("country")}
          />
          <datalist id="ob-country-options">
            {COUNTRY_SUGGESTIONS.map((country) => (
              <option key={country} value={country} />
            ))}
          </datalist>
        </Field>

        <Field
          id="ob-city"
          label="City"
          required={isLocal}
          optional={!isLocal}
          error={errors.city?.message}
          hint={isLocal ? "Local questions mention your city, e.g. “best dentist in Austin”." : undefined}
        >
          <Input
            id="ob-city"
            autoComplete="address-level2"
            placeholder="e.g. Austin"
            aria-required={isLocal || undefined}
            {...fieldAria("ob-city", errors.city?.message, isLocal)}
            {...register("city")}
          />
        </Field>
      </div>
    </div>
  );
}
