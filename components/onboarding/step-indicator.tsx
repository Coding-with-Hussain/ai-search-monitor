"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import type { WizardStep } from "./constants";

/**
 * Segmented progress for the wizard. Visited steps are buttons so users can
 * jump back (and forward again to steps they already completed).
 */
export function StepIndicator({
  steps,
  current,
  maxReached,
  onSelect,
  disabled,
}: {
  steps: WizardStep[];
  current: number;
  maxReached: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
}) {
  return (
    <nav aria-label="Setup progress">
      <ol className="grid grid-cols-4 gap-2 sm:gap-3">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const reachable = index <= maxReached && !active && !disabled;
          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(index)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${step.label}${done ? " (completed)" : active ? " (current)" : ""}`}
                className={cn(
                  "group flex w-full min-w-0 flex-col gap-2 rounded-md text-left disabled:cursor-default",
                  reachable && "cursor-pointer",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1 w-full rounded-full transition-colors duration-300",
                    done || active ? "bg-primary" : "bg-surface-sunken",
                  )}
                />
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "hidden size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold sm:inline-flex",
                      done && "border-primary bg-primary text-primary-foreground",
                      active && "border-primary text-primary",
                      !done && !active && "border-border-strong text-subtle-foreground",
                    )}
                  >
                    {done ? <Check className="size-3" strokeWidth={3} /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "truncate text-[11px] font-medium sm:text-[13px]",
                      active ? "text-foreground" : "text-muted-foreground",
                      reachable && "group-hover:text-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
