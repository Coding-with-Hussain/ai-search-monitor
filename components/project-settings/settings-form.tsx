"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { Controller, type FieldPath, useForm, useWatch } from "react-hook-form";

import { updateProjectSettingsAction } from "@/app/actions/project-settings";
import { SimulationBadge } from "@/components/app/simulation-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatNumber, pluralize } from "@/lib/format";
import { PROVIDER_META } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import { BUSINESS_TYPES, type BusinessType, type MonitoringFrequency, PROVIDER_IDS, type ProviderId } from "@/types/domain";

import { Field, fieldAria, SettingsSection } from "./field";
import { type ProjectSettingsInput, projectSettingsSchema, type ProjectSettingsValues } from "./schema";
import { TagInput } from "./tag-input";

const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  local: "Local business",
  saas: "SaaS",
  ecommerce: "E-commerce",
  services: "Services & agencies",
};

const FREQUENCY_LABEL: Record<MonitoringFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  manual: "Manual only",
};

const SCANS_PER_MONTH: Record<MonitoringFrequency, number> = { daily: 30, weekly: 4, monthly: 1, manual: 0 };

const FIELD_NAMES = new Set<string>([
  "name",
  "website",
  "industry",
  "businessType",
  "country",
  "city",
  "description",
  "services",
  "aliases",
  "monitoringFrequency",
  "monitoringEnabled",
  "providers",
]);

export interface FrequencyOption {
  value: MonitoringFrequency;
  allowed: boolean;
  /** Plans that include it, when not allowed (e.g. "Pro and Agency"). */
  availableOn?: string;
}

export interface SettingsFormProps {
  projectId: string;
  defaults: ProjectSettingsInput;
  frequencyOptions: FrequencyOption[];
  planName: string;
  queriesPerMonth: number;
  activeQuestions: number;
  mockMode: boolean;
  /** Live mode: platforms without an API key are skipped in scans. */
  unconfiguredProviders: ProviderId[];
}

/** Business info, services, aliases and monitoring preferences in one form with a sticky save bar. */
export function ProjectSettingsForm({
  projectId,
  defaults,
  frequencyOptions,
  planName,
  queriesPerMonth,
  activeQuestions,
  mockMode,
  unconfiguredProviders,
}: SettingsFormProps) {
  const id = useId();
  const form = useForm<ProjectSettingsInput, unknown, ProjectSettingsValues>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const {
    register,
    control,
    formState: { errors, isDirty },
  } = form;

  const { execute, pending } = useServerAction(updateProjectSettingsAction, {
    successMessage: "Project settings saved",
    onSuccess: () => form.reset(form.getValues()),
    onError: (result) => {
      for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
        const root = key.split(".")[0];
        if (FIELD_NAMES.has(root) && messages[0]) {
          form.setError(root as FieldPath<ProjectSettingsInput>, { type: "server", message: messages[0] });
        }
      }
    },
  });

  const onSubmit = form.handleSubmit((values) => execute({ projectId, ...values }));

  const businessType = useWatch({ control, name: "businessType" });
  const frequency = useWatch({ control, name: "monitoringFrequency" });
  const enabled = useWatch({ control, name: "monitoringEnabled" });
  const description = useWatch({ control, name: "description" }) ?? "";
  const automatic = enabled && frequency !== "manual";
  const monthly = automatic ? activeQuestions * SCANS_PER_MONTH[frequency] : 0;
  const locked = frequencyOptions.filter((o) => !o.allowed && o.value !== frequency);

  /** First message from a field-array error (root message or the first item's). */
  const arrayError = (e: unknown): string | undefined => {
    if (!e || typeof e !== "object") return undefined;
    const err = e as { message?: unknown; root?: { message?: unknown } };
    if (typeof err.message === "string") return err.message;
    if (typeof err.root?.message === "string") return err.root.message;
    for (const value of Object.values(e as Record<string, unknown>)) {
      if (value && typeof value === "object" && typeof (value as { message?: unknown }).message === "string") {
        return (value as { message: string }).message;
      }
    }
    return undefined;
  };
  const servicesError = arrayError(errors.services);
  const aliasesError = arrayError(errors.aliases);
  const providersError = arrayError(errors.providers);

  const f = (name: string) => `${id}-${name}`;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 sm:gap-6" aria-label="Project settings">
      <SettingsSection
        id="business"
        title="Business information"
        description="How we recognise your business in AI answers and write realistic buyer questions. Changes apply to future scans."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={f("name")} label="Business name" error={errors.name?.message}>
            <Input id={f("name")} autoComplete="organization" maxLength={120} {...register("name")} {...fieldAria(f("name"), errors.name?.message)} />
          </Field>
          <Field id={f("website")} label="Website" optional error={errors.website?.message} hint="Used to detect when AI answers cite your site.">
            <Input
              id={f("website")}
              inputMode="url"
              autoComplete="url"
              placeholder="example.com"
              maxLength={200}
              {...register("website")}
              {...fieldAria(f("website"), errors.website?.message, true)}
            />
          </Field>
          <Field id={f("industry")} label="Industry" error={errors.industry?.message} hint="A short category, e.g. “Dentist” or “CRM software”.">
            <Input id={f("industry")} maxLength={80} {...register("industry")} {...fieldAria(f("industry"), errors.industry?.message, true)} />
          </Field>
          <Field id={f("businessType")} label="Business type" error={errors.businessType?.message}>
            <NativeSelect id={f("businessType")} {...register("businessType")} {...fieldAria(f("businessType"), errors.businessType?.message)}>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BUSINESS_TYPE_LABEL[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id={f("country")} label="Country" optional error={errors.country?.message}>
            <Input id={f("country")} autoComplete="country-name" maxLength={80} {...register("country")} {...fieldAria(f("country"), errors.country?.message)} />
          </Field>
          <Field
            id={f("city")}
            label="City"
            optional={businessType !== "local"}
            error={errors.city?.message}
            hint={businessType === "local" ? "Required for local businesses: buyer questions mention your city." : undefined}
          >
            <Input
              id={f("city")}
              autoComplete="address-level2"
              maxLength={80}
              {...register("city")}
              {...fieldAria(f("city"), errors.city?.message, businessType === "local")}
            />
          </Field>
          <Field
            id={f("description")}
            label="Short description"
            optional
            className="sm:col-span-2"
            error={errors.description?.message}
            hint={
              <span className="flex justify-between gap-3">
                <span>What you do and who you serve, in a sentence or two.</span>
                <span className={cn("shrink-0 tabular", description.length > 480 && "text-warning-text")}>{description.length}/500</span>
              </span>
            }
          >
            <Textarea
              id={f("description")}
              rows={3}
              maxLength={500}
              {...register("description")}
              {...fieldAria(f("description"), errors.description?.message, true)}
            />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        id="services"
        title="Products & services"
        description="What customers buy from you. Used to write buyer questions and to group results by service."
      >
        <Controller
          control={control}
          name="services"
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor={f("services")} className="sr-only">
                Add a product or service
              </Label>
              <TagInput
                id={f("services")}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                max={15}
                minLength={2}
                maxLength={60}
                noun="service"
                placeholder="e.g. teeth whitening"
                invalid={Boolean(servicesError)}
                describedBy={servicesError ? `${f("services")}-error` : undefined}
              />
              {servicesError && (
                <p id={`${f("services")}-error`} className="text-[13px] text-danger-text">
                  {servicesError}
                </p>
              )}
            </div>
          )}
        />
      </SettingsSection>

      <SettingsSection
        id="aliases"
        title="Brand aliases"
        description={
          <>
            Other names or spellings AI assistants might use for your business, such as “ABC Dental Clinic”, “ABCDental” or a
            former name. A mention of any alias counts as a mention of your business. Leave this empty if your name is unique.
          </>
        }
      >
        <Controller
          control={control}
          name="aliases"
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor={f("aliases")} className="sr-only">
                Add a brand alias
              </Label>
              <TagInput
                id={f("aliases")}
                value={field.value ?? []}
                onChange={field.onChange}
                onBlur={field.onBlur}
                max={10}
                minLength={2}
                maxLength={120}
                noun="alias"
                placeholder="e.g. ABC Dental Clinic"
                invalid={Boolean(aliasesError)}
                describedBy={aliasesError ? `${f("aliases")}-error` : undefined}
              />
              {aliasesError && (
                <p id={`${f("aliases")}-error`} className="text-[13px] text-danger-text">
                  {aliasesError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Avoid generic words (like “dental clinic”) that could match other businesses.
              </p>
            </div>
          )}
        />
      </SettingsSection>

      <SettingsSection
        id="monitoring"
        title="Monitoring"
        description="How often we ask AI assistants your active questions, and on which platforms."
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor={f("enabled")} className="text-sm">
                Automatic monitoring
              </Label>
              <p id={f("enabled-hint")} className="mt-1 text-[13px] leading-snug text-muted-foreground">
                {frequency === "manual"
                  ? "Manual only: scans run when you click Run scan."
                  : enabled
                    ? `AI answers are checked automatically (${FREQUENCY_LABEL[frequency].toLowerCase()}).`
                    : "Automatic scans are paused. You can still run scans manually."}
              </p>
            </div>
            <Controller
              control={control}
              name="monitoringEnabled"
              render={({ field }) => (
                <Switch
                  id={f("enabled")}
                  ref={field.ref}
                  checked={field.value && frequency !== "manual"}
                  disabled={frequency === "manual"}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-describedby={f("enabled-hint")}
                  className="mt-0.5"
                />
              )}
            />
          </div>

          <Field
            id={f("frequency")}
            label="Scan frequency"
            error={errors.monitoringFrequency?.message}
            hint={
              locked.length > 0 ? (
                <span className="inline-flex flex-wrap items-center gap-1">
                  <Lock className="size-3" aria-hidden="true" />
                  {locked.map((o) => `${FREQUENCY_LABEL[o.value]} monitoring is available on ${o.availableOn ?? "higher"} plans`).join(". ")}.{" "}
                  <Link href="/billing#plans" className="font-medium text-foreground underline underline-offset-2">
                    Compare plans
                  </Link>
                </span>
              ) : undefined
            }
          >
            <NativeSelect
              id={f("frequency")}
              className="sm:max-w-xs"
              {...register("monitoringFrequency")}
              {...fieldAria(f("frequency"), errors.monitoringFrequency?.message, locked.length > 0)}
            >
              {frequencyOptions.map((o) => (
                <option key={o.value} value={o.value} disabled={!o.allowed && o.value !== defaults.monitoringFrequency}>
                  {FREQUENCY_LABEL[o.value]}
                  {!o.allowed ? ` (${o.availableOn ?? "upgrade"})` : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <fieldset className="flex flex-col gap-3" aria-describedby={providersError ? f("providers-error") : undefined}>
            <legend className="mb-1 flex flex-wrap items-center gap-2 text-[13px] font-medium">
              AI platforms
              {mockMode && <SimulationBadge label="Simulation mode" />}
            </legend>
            <Controller
              control={control}
              name="providers"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-3">
                  {PROVIDER_IDS.map((p) => {
                    const checked = field.value.includes(p);
                    const unconfigured = !mockMode && unconfiguredProviders.includes(p);
                    return (
                      <label
                        key={p}
                        htmlFor={f(`provider-${p}`)}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                          checked ? "border-primary/50 bg-primary-soft/50" : "border-border hover:bg-surface-muted",
                        )}
                      >
                        <Checkbox
                          id={f(`provider-${p}`)}
                          checked={checked}
                          onCheckedChange={(v) =>
                            field.onChange(v === true ? PROVIDER_IDS.filter((x) => x === p || field.value.includes(x)) : field.value.filter((x) => x !== p))
                          }
                          onBlur={field.onBlur}
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{PROVIDER_META[p].name}</span>
                          <span className="block text-xs text-muted-foreground">{PROVIDER_META[p].vendor}</span>
                          {unconfigured && (
                            <span className="mt-1 block text-xs text-warning-text">Not configured yet: skipped in live scans.</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {providersError && (
              <p id={f("providers-error")} className="text-[13px] text-danger-text">
                {providersError}
              </p>
            )}
            {mockMode && (
              <p className="text-xs text-muted-foreground">
                Simulation mode is on, so scans use simulated AI answers for every platform (clearly labelled in results).
              </p>
            )}
          </fieldset>

          <p className="rounded-lg border border-border bg-surface-muted/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
            {automatic ? (
              <>
                <span className="font-medium text-foreground tabular">{pluralize(activeQuestions, "active question")}</span> ×{" "}
                {FREQUENCY_LABEL[frequency].toLowerCase()} ≈{" "}
                <span className="font-medium text-foreground tabular">{formatNumber(monthly)}</span> queries/month — your {planName} plan
                includes <span className="tabular">{formatNumber(queriesPerMonth)}</span>.
                {monthly > queriesPerMonth && (
                  <span className="text-warning-text"> When you run low, scans check your highest-priority questions first.</span>
                )}
              </>
            ) : (
              <>
                Only manual scans: each one uses{" "}
                <span className="font-medium text-foreground tabular">{pluralize(activeQuestions, "query", "queries")}</span> (one per active
                question). Your {planName} plan includes <span className="tabular">{formatNumber(queriesPerMonth)}</span> queries/month.
              </>
            )}
          </p>
        </div>
      </SettingsSection>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-surface px-4 py-3 sm:bottom-4 sm:mx-0 sm:rounded-xl sm:border sm:px-5 sm:shadow-pop">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted-foreground" aria-live="polite">
            {isDirty ? "You have unsaved changes." : "All changes saved."}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={!isDirty || pending} onClick={() => form.reset()} className="flex-1 sm:flex-none">
              Discard
            </Button>
            <Button type="submit" loading={pending} disabled={!isDirty} className="flex-1 sm:flex-none">
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
