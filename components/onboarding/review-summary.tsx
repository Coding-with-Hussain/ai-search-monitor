"use client";

import { Pencil } from "lucide-react";
import type * as React from "react";
import { useWatch } from "react-hook-form";
import type { Control } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { extractDomain } from "@/lib/domain";
import { providerName } from "@/lib/providers-meta";
import type { BusinessType, MonitoringFrequency } from "@/types/domain";

import { BUSINESS_TYPE_LABEL, FREQUENCY_LABEL } from "./constants";
import type { OnboardingInput, OnboardingValues } from "./schema";

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <h4 className="text-xs font-medium text-subtle-foreground">{title}</h4>
        <div className="mt-1 text-[13px] leading-relaxed break-words text-foreground">{children}</div>
      </div>
      {onEdit && (
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="-mr-2 shrink-0 text-muted-foreground">
          <Pencil aria-hidden="true" />
          Edit<span className="sr-only"> {title.toLowerCase()}</span>
        </Button>
      )}
    </li>
  );
}

/** Read-only summary of everything entered, with shortcuts back to each step. */
export function ReviewSummary({
  control,
  onEdit,
}: {
  control: Control<OnboardingInput, unknown, OnboardingValues>;
  onEdit: (step: number) => void;
}) {
  const values = useWatch({ control });
  const location = [values.city, values.country].map((v) => v?.trim()).filter(Boolean).join(", ");
  const domain = extractDomain(values.website ?? null);
  const services = (values.services ?? []).filter((s): s is string => Boolean(s));
  const competitors = (values.competitors ?? []).map((c) => c?.name?.trim()).filter((n): n is string => Boolean(n));
  const monitoring = values.monitoring;
  const providers = (monitoring?.providers ?? []).filter(Boolean).map((p) => providerName(p as string));
  const frequency = (monitoring?.frequency ?? "weekly") as MonitoringFrequency;

  return (
    <section aria-labelledby="ob-review-title" className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <h3 id="ob-review-title" className="mb-3 text-sm font-semibold tracking-tight">
        Review
      </h3>
      <ul className="divide-y divide-border">
        <Section title="Business" onEdit={() => onEdit(0)}>
          <span className="font-medium">{values.name?.trim() || "Not set"}</span>
          {domain && <span className="text-muted-foreground"> · {domain}</span>}
          <br />
          <span className="text-muted-foreground">
            {[values.industry?.trim(), values.businessType ? BUSINESS_TYPE_LABEL[values.businessType as BusinessType] : null, location]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </Section>
        <Section title="Services" onEdit={() => onEdit(1)}>
          {services.length ? services.join(", ") : <span className="text-muted-foreground">None added</span>}
        </Section>
        <Section title="Competitors" onEdit={() => onEdit(2)}>
          {competitors.length ? competitors.join(", ") : <span className="text-muted-foreground">None added</span>}
        </Section>
        <Section title="Monitoring">
          {monitoring?.generateQueries ? `${monitoring.queryCount ?? 0} generated questions` : "Questions added manually"}
          {" · "}
          {FREQUENCY_LABEL[frequency]}
          {" · "}
          {providers.length ? providers.join(", ") : <span className="text-danger-text">No AI platform selected</span>}
        </Section>
      </ul>
    </section>
  );
}
