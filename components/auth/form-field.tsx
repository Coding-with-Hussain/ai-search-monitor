import type * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** aria-* props linking a control to its error / hint text. */
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

/** Label + control + hint + error, with consistent spacing and ids. */
export function FormField({
  id,
  label,
  error,
  hint,
  labelAside,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  /** Rendered at the end of the label row (e.g. "Forgot password?"). */
  labelAside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {labelAside}
      </div>
      {children}
      {hint && (
        <div id={`${id}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </div>
      )}
      <FieldError id={id} message={error} />
    </div>
  );
}
