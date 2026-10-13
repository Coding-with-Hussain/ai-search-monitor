"use client";

import { Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useFieldArray, useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { FieldError, fieldAria } from "./field";
import { MAX_ONBOARDING_COMPETITORS, type OnboardingInput, type OnboardingValues } from "./schema";

export function StepCompetitors({ limit, planName }: { limit: number | null; planName: string }) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<OnboardingInput, unknown, OnboardingValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "competitors" });
  const max = Math.min(limit ?? MAX_ONBOARDING_COMPETITORS, MAX_ONBOARDING_COMPETITORS);
  const atLimit = fields.length >= max;
  const listError = errors.competitors?.message ?? errors.competitors?.root?.message;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-foreground">Competitors</p>
        <p className={cn("tabular text-xs text-muted-foreground", atLimit && limit !== null && "font-medium text-foreground")}>
          {limit === null ? `${fields.length} added` : `${fields.length} / ${limit}`}
          <span className="sr-only"> competitors{limit === null ? "" : " allowed on your plan"}</span>
        </p>
      </div>

      {fields.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border-strong px-6 py-8 text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
            <Users className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium">No competitors added</p>
          <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
            You can skip this step. AI answers often name other businesses; adding the ones you compete with makes the
            comparison clearer.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {fields.map((field, index) => {
            const nameError = errors.competitors?.[index]?.name?.message;
            const websiteError = errors.competitors?.[index]?.website?.message;
            const nameId = `ob-competitor-${index}-name`;
            const siteId = `ob-competitor-${index}-website`;
            return (
              <li key={field.id} className="rounded-xl border border-border bg-surface-muted/40 p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <Label htmlFor={nameId} className="text-xs text-muted-foreground">
                        Competitor {index + 1} name
                      </Label>
                      <Input
                        id={nameId}
                        autoComplete="off"
                        placeholder="e.g. Bright Smile Dental"
                        {...fieldAria(nameId, nameError)}
                        {...register(`competitors.${index}.name`)}
                      />
                      <FieldError id={nameId} message={nameError} />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <Label htmlFor={siteId} className="text-xs text-muted-foreground">
                        Website <span className="text-subtle-foreground">(optional)</span>
                      </Label>
                      <Input
                        id={siteId}
                        inputMode="url"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="competitor.com"
                        {...fieldAria(siteId, websiteError)}
                        {...register(`competitors.${index}.website`)}
                      />
                      <FieldError id={siteId} message={websiteError} />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="mt-6 text-muted-foreground hover:text-danger-text"
                    onClick={() => remove(index)}
                    aria-label={`Remove competitor ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FieldError id="ob-competitors" message={listError} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ name: "", website: "" }, { focusName: `competitors.${fields.length}.name` })}
          disabled={atLimit}
          aria-describedby={atLimit ? "ob-competitor-limit" : undefined}
        >
          <Plus aria-hidden="true" />
          Add competitor
        </Button>
        {atLimit && (
          <p id="ob-competitor-limit" className="text-[13px] text-muted-foreground">
            {limit !== null && limit <= max ? (
              <>
                Your {planName} plan tracks up to {limit} competitor{limit === 1 ? "" : "s"} per project.{" "}
                <Link href="/billing#plans" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                  Compare plans<span className="sr-only"> (opens in a new tab)</span>
                </Link>
              </>
            ) : (
              <>You can add up to {max} competitors during setup. Add more later from the Competitors tab.</>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
