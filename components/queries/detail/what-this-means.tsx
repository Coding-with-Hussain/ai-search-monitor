import { ArrowRight, CircleCheck, CircleMinus, CircleX, Lightbulb } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Meaning } from "./insights";

const TONE = {
  positive: { icon: CircleCheck, className: "text-success-text", label: "Good" },
  negative: { icon: CircleX, className: "text-danger-text", label: "Gap" },
  neutral: { icon: CircleMinus, className: "text-muted-foreground", label: "Note" },
} as const;

/** Generated, plain-language reading of this question's monitored answers. */
export function WhatThisMeans({ meaning, recommendationsHref }: { meaning: Meaning; recommendationsHref: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed font-medium text-pretty">{meaning.summary}</p>
      {meaning.points.length > 0 && (
        <ul className="space-y-2">
          {meaning.points.map((p) => {
            const tone = TONE[p.tone];
            const Icon = tone.icon;
            return (
              <li key={p.text} className="flex items-start gap-2 text-[13px] leading-relaxed">
                <Icon className={cn("mt-0.5 size-4 shrink-0", tone.className)} aria-hidden="true" />
                <span>
                  <span className="sr-only">{tone.label}: </span>
                  {p.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          {meaning.hasGap
            ? "Your recommendations list practical steps that may help AI assistants understand and cite your business for questions like this, such as a page that answers it directly."
            : "You're in a strong position for this question. Keep your website and listings current, and keep monitoring, as AI answers change over time."}
        </p>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={recommendationsHref}>
            View recommendations
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <p className="text-xs text-subtle-foreground">
        These are observed signals from the monitored answers in this scan, not proven causes. AI answers can vary between runs.
      </p>
    </div>
  );
}
