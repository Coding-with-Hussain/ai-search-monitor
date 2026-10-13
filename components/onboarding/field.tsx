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

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="text-[13px] leading-snug text-danger-text">
      {message}
    </p>
  );
}

/** Label + control + hint + error with consistent spacing and ids. */
export function Field({
  id,
  label,
  error,
  hint,
  optional,
  required,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {label}
        {optional && <span className="text-xs font-normal text-subtle-foreground">Optional</span>}
        {required && <span className="text-xs font-normal text-subtle-foreground">Required</span>}
      </Label>
      {children}
      {hint && (
        <div id={`${id}-hint`} className="text-[13px] leading-snug text-muted-foreground">
          {hint}
        </div>
      )}
      <FieldError id={id} message={error} />
    </div>
  );
}
