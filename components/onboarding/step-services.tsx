"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";

import { SERVICE_PLACEHOLDER } from "./constants";
import { FieldError } from "./field";
import { MAX_SERVICES, type OnboardingInput, type OnboardingValues } from "./schema";
import { TagInput } from "./tag-input";

export function StepServices() {
  const {
    control,
    formState: { errors },
  } = useFormContext<OnboardingInput, unknown, OnboardingValues>();
  const businessType = useWatch({ control, name: "businessType" });
  const error = errors.services?.message ?? errors.services?.root?.message;
  const itemError = Array.isArray(errors.services) ? errors.services.find((e) => e?.message)?.message : undefined;
  const message = error ?? itemError;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="ob-services" className="text-[13px] font-medium text-foreground">
        Products or services
      </label>
      <Controller
        control={control}
        name="services"
        render={({ field }) => (
          <TagInput
            id="ob-services"
            inputRef={field.ref}
            value={field.value ?? []}
            onChange={field.onChange}
            onBlur={field.onBlur}
            max={MAX_SERVICES}
            noun="service"
            placeholder={SERVICE_PLACEHOLDER[businessType] ?? SERVICE_PLACEHOLDER.local}
            invalid={Boolean(message)}
            describedBy={message ? "ob-services-error" : undefined}
          />
        )}
      />
      <FieldError id="ob-services" message={message} />
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        Tip: use the words customers use. “Dental implants” works better than an internal product code. Your most important
        service first helps us prioritise questions.
      </p>
    </div>
  );
}
