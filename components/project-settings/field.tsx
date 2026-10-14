import type * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** aria-* props linking a control to its hint and error text. */
export function fieldAria(id: string, error?: string, hint?: boolean) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ");
  return {
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy || undefined,
  };
}

/** Label + control + hint + error with consistent spacing and ids. */
export function Field({
  id,
  label,
  error,
  hint,
  optional,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label htmlFor={id} className="flex min-h-4 items-center gap-1.5">
        {label}
        {optional && <span className="text-xs font-normal text-subtle-foreground">Optional</span>}
      </Label>
      {children}
      {hint && (
        <div id={`${id}-hint`} className="text-xs leading-snug text-muted-foreground">
          {hint}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="text-[13px] leading-snug text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}

/** Card-like settings section with a heading column and a fields column on wide screens. */
export function SettingsSection({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="grid gap-5 rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-10"
    >
      <div className="min-w-0">
        <h2 id={headingId} className="text-[15px] font-semibold tracking-tight">
          {title}
        </h2>
        <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
