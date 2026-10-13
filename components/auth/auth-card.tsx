import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

/** The card that holds every auth form: title, description, body, footer. */
export function AuthCard({
  title,
  description,
  icon: Icon,
  children,
  footer,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional status icon shown above the title (e.g. on result screens). */
  icon?: LucideIcon;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card sm:p-8">
        {Icon && (
          <div className="mb-5 flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </div>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description && <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</div>}
        {children && <div className="mt-6">{children}</div>}
      </div>
      {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}

/** Inline text link styled for auth copy. */
export const authLinkClass =
  "font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
