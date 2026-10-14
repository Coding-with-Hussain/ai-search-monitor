import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** One settings section (anchor target for the settings navigation). */
export function SettingsSection({
  id,
  title,
  description,
  children,
  footer,
  tone = "default",
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "danger";
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-20 rounded-xl border bg-surface shadow-card",
        tone === "danger" ? "border-danger/30" : "border-border",
      )}
    >
      <div className="p-5 pb-0 sm:p-6 sm:pb-0">
        <h2 id={headingId} className={cn("text-[15px] font-semibold tracking-tight", tone === "danger" && "text-danger-text")}>
          {title}
        </h2>
        {description && <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</div>}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
      {footer && (
        <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          {footer}
        </div>
      )}
    </section>
  );
}

/** aria-* props linking a control to its hint and error text. */
export function fieldAria(id: string, error?: string, hint?: boolean) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ");
  return {
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy || undefined,
  };
}

/** Label + control + hint + error with consistent spacing and ids. */
export function SettingsField({
  id,
  label,
  error,
  hint,
  optional,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  children: ReactNode;
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
