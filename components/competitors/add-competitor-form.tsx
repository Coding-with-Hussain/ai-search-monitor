"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";
import type * as React from "react";

import { addCompetitorAction } from "@/app/actions/competitors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerAction } from "@/hooks/use-server-action";
import { competitorInputSchema } from "@/schemas/project";

type Errors = Partial<Record<"name" | "website", string>>;

/** Inline "Add competitor" form (name + optional website). Plan limits are enforced on the server. */
export function AddCompetitorForm({ projectId, disabled }: { projectId: string; disabled?: boolean }) {
  const id = useId();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const { execute, pending } = useServerAction(addCompetitorAction, {
    successMessage: (d) => `${d.name} added as a competitor`,
    onSuccess: () => {
      setName("");
      setWebsite("");
      setErrors({});
    },
    onError: (result) => {
      const fe = result.fieldErrors ?? {};
      setErrors({ name: fe.name?.[0], website: fe.website?.[0] });
    },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = competitorInputSchema.safeParse({ name, website });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    void execute({ projectId, name: parsed.data.name, website: parsed.data.website });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-name`} className="flex min-h-4 items-center">
          Competitor name
        </Label>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
          }}
          placeholder="e.g. Smile Clinic"
          maxLength={120}
          autoComplete="off"
          disabled={disabled || pending}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
        />
        {errors.name && (
          <p id={`${id}-name-error`} className="text-[13px] text-danger-text">
            {errors.name}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-website`} className="flex min-h-4 items-center gap-1.5">
          Website
          <span className="text-xs font-normal text-subtle-foreground">Optional</span>
        </Label>
        <Input
          id={`${id}-website`}
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            if (errors.website) setErrors((x) => ({ ...x, website: undefined }));
          }}
          placeholder="smileclinic.com"
          inputMode="url"
          autoComplete="off"
          maxLength={200}
          disabled={disabled || pending}
          aria-invalid={errors.website ? true : undefined}
          aria-describedby={`${id}-website-hint${errors.website ? ` ${id}-website-error` : ""}`}
        />
        <p id={`${id}-website-hint`} className="text-xs text-muted-foreground">
          Lets us detect when AI answers cite their site.
        </p>
        {errors.website && (
          <p id={`${id}-website-error`} className="text-[13px] text-danger-text">
            {errors.website}
          </p>
        )}
      </div>
      <Button type="submit" className="h-10 sm:mt-[1.375rem]" loading={pending} disabled={disabled}>
        {!pending && <Plus aria-hidden="true" />}
        Add competitor
      </Button>
    </form>
  );
}
