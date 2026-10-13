import { Check, type LucideIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

/** One detailed feature: copy on one side, a product visual on the other. */
export function FeatureBlock({
  id,
  icon: Icon,
  eyebrow,
  title,
  description,
  bullets,
  note,
  visual,
  reverse = false,
}: {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  note?: React.ReactNode;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-border py-16 first:border-t-0 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={cn(reverse && "lg:order-2")}>
          <p className="inline-flex items-center gap-2 text-[13px] font-medium text-primary">
            <Icon className="size-4" aria-hidden="true" />
            {eyebrow}
          </p>
          <h2 id={`${id}-title`} className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-balance sm:text-3xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground">{description}</p>
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex gap-3 text-sm leading-relaxed text-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {note && <p className="mt-6 text-[13px] leading-relaxed text-subtle-foreground">{note}</p>}
        </div>
        <div className={cn("min-w-0", reverse && "lg:order-1")}>{visual}</div>
      </div>
    </section>
  );
}
