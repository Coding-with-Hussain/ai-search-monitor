import { useId } from "react";
import type * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Titled card section used on the question detail and competitors pages. */
export function DetailSection({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const headingId = useId();
  return (
    <Card className={cn("min-w-0", className)}>
      <section aria-labelledby={headingId}>
        <div className="flex flex-col gap-3 p-5 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 id={headingId} className="text-[15px] leading-snug font-semibold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
        <div className="px-5 pb-5">{children}</div>
      </section>
    </Card>
  );
}
