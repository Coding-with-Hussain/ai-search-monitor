import { useId } from "react";
import type * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Card with a heading, optional description and header actions (History and Reports sections). */
export function Panel({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const headingId = useId();
  return (
    <Card className={cn("print-avoid-break flex min-w-0 flex-col", className)}>
      <section aria-labelledby={headingId} className="flex flex-1 flex-col">
        <div className="flex flex-col gap-3 p-5 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 id={headingId} className="text-[15px] leading-snug font-semibold tracking-tight">
              {title}
            </h3>
            {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
        <div className={cn("flex-1 px-5 pb-5", bodyClassName)}>{children}</div>
      </section>
    </Card>
  );
}
