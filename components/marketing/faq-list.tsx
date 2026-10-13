import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import type { FaqItem } from "./faq-data";

/**
 * Accessible FAQ built on native <details>/<summary> disclosure widgets:
 * keyboard operable, announced as expandable, and works without JavaScript.
 */
export function FaqList({ items, className }: { items: FaqItem[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-border rounded-xl border border-border bg-surface shadow-card", className)}>
      {items.map((item) => (
        <details key={item.id} id={item.id} className="group scroll-mt-24">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-left text-[15px] font-medium text-foreground transition-colors hover:bg-surface-muted/60 sm:px-6 [&::-webkit-details-marker]:hidden">
            <h3 className="font-medium">{item.question}</h3>
            <ChevronDown
              className="size-4 shrink-0 text-subtle-foreground transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground sm:px-6">
            <p className="max-w-3xl">{item.answer}</p>
            {item.link && (
              <Link
                href={item.link.href}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {item.link.label}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
