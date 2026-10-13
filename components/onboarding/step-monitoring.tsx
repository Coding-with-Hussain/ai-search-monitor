"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";

import { SimulationBadge } from "@/components/app/simulation-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { PROVIDER_META } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import { type MonitoringFrequency, PROVIDER_IDS, type ProviderId } from "@/types/domain";

import { Field, FieldError, fieldAria } from "./field";
import { ReviewSummary } from "./review-summary";
import { MAX_QUERY_COUNT, MIN_QUERY_COUNT, type OnboardingInput, type OnboardingValues } from "./schema";
import type { WizardConfig } from "./types";
import { UsageEstimate } from "./usage-estimate";

function clampCount(n: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_QUERY_COUNT, Math.max(MIN_QUERY_COUNT, Math.round(n)));
}

export function StepMonitoring({ config, onEditStep }: { config: WizardConfig; onEditStep: (step: number) => void }) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<OnboardingInput, unknown, OnboardingValues>();
  const generate = useWatch({ control, name: "monitoring.generateQueries" });
  const queryCount = useWatch({ control, name: "monitoring.queryCount" });
  const frequency = useWatch({ control, name: "monitoring.frequency" }) as MonitoringFrequency;
  const runFirstScan = useWatch({ control, name: "runFirstScan" }) ?? true;
  const lockedOptions = config.frequencyOptions.filter((o) => !o.allowed);
  const providerError = errors.monitoring?.providers?.message ?? errors.monitoring?.providers?.root?.message;

  return (
    <div className="flex flex-col gap-7">
      {/* Question generation */}
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label htmlFor="ob-generate" className="text-sm">
              Generate buyer-intent questions automatically
            </Label>
            <p id="ob-generate-hint" className="mt-1 text-[13px] leading-snug text-muted-foreground">
              We write the questions customers are likely to ask AI assistants, based on your services, location and
              competitors. You can edit, pause or add questions at any time.
            </p>
          </div>
          <Controller
            control={control}
            name="monitoring.generateQueries"
            render={({ field }) => (
              <Switch
                id="ob-generate"
                ref={field.ref}
                checked={field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                aria-describedby="ob-generate-hint"
                className="mt-0.5"
              />
            )}
          />
        </div>

        <Controller
          control={control}
          name="monitoring.queryCount"
          render={({ field }) => {
            const value = Number.isFinite(field.value) ? field.value : "";
            const error = errors.monitoring?.queryCount?.message;
            return (
              <div className={cn("flex flex-col gap-2", !generate && "opacity-60")}>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="ob-query-count">Number of questions</Label>
                  <Input
                    id="ob-query-count"
                    ref={field.ref}
                    type="number"
                    inputMode="numeric"
                    min={MIN_QUERY_COUNT}
                    max={MAX_QUERY_COUNT}
                    step={1}
                    value={value}
                    disabled={!generate}
                    onChange={(e) => field.onChange(e.target.value === "" ? Number.NaN : e.target.valueAsNumber)}
                    onKeyDown={(e) => {
                      // Normalise before Enter submits the form.
                      if (e.key === "Enter") field.onChange(clampCount(field.value, config.defaults.queryCount));
                    }}
                    onBlur={() => {
                      field.onChange(clampCount(field.value, config.defaults.queryCount));
                      field.onBlur();
                    }}
                    className="tabular h-9 w-20 text-right"
                    {...fieldAria("ob-query-count", error, true)}
                  />
                </div>
                <input
                  type="range"
                  min={MIN_QUERY_COUNT}
                  max={MAX_QUERY_COUNT}
                  step={1}
                  value={Number.isFinite(field.value) ? field.value : config.defaults.queryCount}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  disabled={!generate}
                  aria-label="Number of questions"
                  aria-describedby="ob-query-count-hint"
                  className="w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
                />
                <div aria-hidden="true" className="tabular flex justify-between text-xs text-subtle-foreground">
                  <span>{MIN_QUERY_COUNT}</span>
                  <span>{MAX_QUERY_COUNT}</span>
                </div>
                <p id="ob-query-count-hint" className="text-[13px] leading-snug text-muted-foreground">
                  More questions give a fuller picture but use more of your monthly queries.
                </p>
                <FieldError id="ob-query-count" message={error} />
              </div>
            );
          }}
        />
      </div>

      {/* Frequency */}
      <Field
        id="ob-frequency"
        label="Monitoring frequency"
        error={errors.monitoring?.frequency?.message}
        hint={
          <>
            {frequency === "manual"
              ? "Scans run only when you start them."
              : "Automatic scans run on this schedule. You can also run a scan at any time."}
            {lockedOptions.map((o) => (
              <span key={o.value} className="block">
                {o.label} monitoring is available on the {o.requiredPlan ?? "higher"} plan and above.
              </span>
            ))}
          </>
        }
      >
        <NativeSelect id="ob-frequency" className="sm:max-w-xs" {...fieldAria("ob-frequency", errors.monitoring?.frequency?.message, true)} {...register("monitoring.frequency")}>
          {config.frequencyOptions.map((o) => (
            <option key={o.value} value={o.value} disabled={!o.allowed}>
              {o.label}
              {!o.allowed && o.requiredPlan ? ` (${o.requiredPlan})` : ""}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <UsageEstimate
        queryCount={queryCount}
        frequency={frequency}
        generate={generate}
        runFirstScan={runFirstScan}
        queriesPerMonth={config.queriesPerMonth}
        remaining={config.remainingQueries}
        planName={config.planName}
      />

      {/* Providers */}
      <fieldset className="flex min-w-0 flex-col gap-3" aria-describedby={providerError ? "ob-providers-error" : undefined}>
        <legend className="mb-3 text-[13px] font-medium text-foreground">AI platforms to monitor</legend>
        <Controller
          control={control}
          name="monitoring.providers"
          render={({ field }) => {
            const selected = (field.value ?? []) as ProviderId[];
            const toggle = (id: ProviderId, on: boolean) =>
              field.onChange(on ? PROVIDER_IDS.filter((p) => p === id || selected.includes(p)) : selected.filter((p) => p !== id));
            return (
              <div className="grid gap-3 sm:grid-cols-3">
                {PROVIDER_IDS.map((id, index) => {
                  const meta = PROVIDER_META[id];
                  const checked = selected.includes(id);
                  const inputId = `ob-provider-${id}`;
                  return (
                    <label
                      key={id}
                      htmlFor={inputId}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                        checked ? "border-primary bg-primary-soft/50" : "border-border hover:border-border-strong hover:bg-surface-muted/60",
                      )}
                    >
                      <Checkbox
                        id={inputId}
                        ref={index === 0 ? field.ref : undefined}
                        checked={checked}
                        onCheckedChange={(v) => toggle(id, v === true)}
                        onBlur={field.onBlur}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">{meta.name}</span>
                        <span className="block text-xs text-muted-foreground">{meta.vendor}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            );
          }}
        />
        <FieldError id="ob-providers" message={providerError} />
      </fieldset>

      {/* First scan */}
      <Controller
        control={control}
        name="runFirstScan"
        render={({ field }) => (
          <div className="flex items-start gap-3">
            <Checkbox
              id="ob-first-scan"
              ref={field.ref}
              checked={generate && field.value !== false}
              disabled={!generate}
              onCheckedChange={(v) => field.onChange(v === true)}
              onBlur={field.onBlur}
              aria-describedby="ob-first-scan-hint"
              className="mt-0.5"
            />
            <div className="min-w-0">
              <Label htmlFor="ob-first-scan">Run the first scan right away</Label>
              <p id="ob-first-scan-hint" className="mt-1 text-[13px] leading-snug text-muted-foreground">
                {generate
                  ? "It takes a few minutes. You'll see live progress on your project page."
                  : "Available once questions are generated. Without them, add questions first and run a scan from your project."}
              </p>
            </div>
          </div>
        )}
      />

      {config.mockMode && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-warning/60 bg-warning-soft/60 p-4 text-[13px] leading-relaxed text-foreground sm:flex-row sm:items-start sm:gap-3">
          <SimulationBadge className="self-start" />
          <p>
            Simulation mode is on, so the first scan uses simulated AI answers. The analysis and scoring are real, but no AI
            platform is queried. Results will be clearly labelled as simulated.
          </p>
        </div>
      )}

      <ReviewSummary control={control} onEdit={onEditStep} />
    </div>
  );
}
