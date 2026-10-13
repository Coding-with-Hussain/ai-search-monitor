"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { completeTourAction } from "@/app/actions/tour";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/lib/utils";

import { TOUR_TARGETS, type TourTarget } from "./types";

const STEPS: Array<{ target: TourTarget; title: string; body: string }> = [
  {
    target: TOUR_TARGETS.score,
    title: "Your AI score",
    body: "Your AI Visibility Score summarizes how often monitored AI answers mention and recommend your business. Open “How is this calculated?” to see the exact weights.",
  },
  {
    target: TOUR_TARGETS.platforms,
    title: "Platform visibility",
    body: "See how you perform on ChatGPT, Gemini and Perplexity separately, and open the questions behind each score.",
  },
  {
    target: TOUR_TARGETS.competitors,
    title: "Competitors",
    body: "Compare your visibility with the competitors you track, from the same monitored answers.",
  },
  {
    target: TOUR_TARGETS.recommendations,
    title: "Recommendations",
    body: "Practical next steps based on observed signals in your monitored answers, highest priority first.",
  },
  {
    target: TOUR_TARGETS.history,
    title: "Historical tracking",
    body: "Every completed scan adds a point here, so you can see how your AI visibility changes over time.",
  },
];

const HIGHLIGHT_STYLES = ["outline", "outlineOffset", "borderRadius", "transition"] as const;

/**
 * First-visit walkthrough of the overview. A non-modal floating card that
 * scrolls each section into view and outlines it. Finishing or skipping (also
 * with Esc) records completion on the user's profile so it shows only once.
 */
export function ProductTour({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const done = useRef(false);
  const titleId = useId();
  const bodyId = useId();
  const { execute } = useServerAction(completeTourAction);

  // Start shortly after the page settles.
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      if (done.current) return;
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
    }, 700);
    return () => clearTimeout(timer);
  }, [enabled]);

  const close = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setOpen(false);
    const target = returnFocus.current;
    if (target && target.isConnected && target !== document.body) target.focus();
    void execute();
  }, [execute]);

  // Scroll the current section into view and outline it.
  useEffect(() => {
    if (!open) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${STEPS[step].target}"]`);
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    const saved = HIGHLIGHT_STYLES.map((key) => [key, el.style[key]] as const);
    const radius = window.getComputedStyle(el).borderTopLeftRadius;
    el.style.transition = "outline-color 200ms ease";
    el.style.outline = "2px solid var(--ring)";
    el.style.outlineOffset = "4px";
    if (radius === "0px") el.style.borderRadius = "0.75rem";
    return () => {
      for (const [key, value] of saved) el.style[key] = value;
    };
  }, [open, step]);

  // Move focus to the step heading so screen readers announce each step.
  useEffect(() => {
    if (open) headingRef.current?.focus({ preventScroll: true });
  }, [open, step]);

  // Esc skips the tour (unless another dialog is open and handles it).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!open) return null;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className="fixed inset-x-4 bottom-4 z-40 rounded-xl border border-border bg-surface p-5 shadow-pop animate-in fade-in-0 slide-in-from-bottom-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]"
      data-testid="product-tour"
    >
      <button
        type="button"
        onClick={close}
        className="absolute top-3 right-3 rounded-md p-1 text-subtle-foreground hover:bg-surface-muted hover:text-foreground"
        aria-label="Skip tour"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      <p className="text-xs font-medium text-primary">
        Step {step + 1} of {STEPS.length}
      </p>
      <h2 ref={headingRef} id={titleId} tabIndex={-1} className="mt-1 pr-6 text-base font-semibold tracking-tight outline-none">
        {current.title}
      </h2>
      <p id={bodyId} className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        {current.body}
      </p>
      <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s.target} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-surface-muted")} />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={close} className="-ml-2 text-muted-foreground">
          Skip tour
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
          )}
          <Button size="sm" onClick={() => (last ? close() : setStep((s) => s + 1))}>
            {last ? "Finish" : "Next"}
            {!last && <ArrowRight aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
