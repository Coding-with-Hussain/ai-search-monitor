"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { type FieldPath, FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { createProjectAction } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useServerAction } from "@/hooks/use-server-action";

import { WIZARD_STEPS } from "./constants";
import { onboardingSchema, type OnboardingInput, type OnboardingValues } from "./schema";
import { StepBusiness } from "./step-business";
import { StepCompetitors } from "./step-competitors";
import { StepIndicator } from "./step-indicator";
import { StepMonitoring } from "./step-monitoring";
import { StepServices } from "./step-services";
import type { WizardConfig } from "./types";

const LAST_STEP = WIZARD_STEPS.length - 1;

function stepOfField(key: string) {
  const top = key.split(".")[0];
  return WIZARD_STEPS.findIndex((s) => (s.fields as string[]).includes(top));
}

/**
 * Four-step project setup. One React Hook Form instance holds every step's
 * values (so nothing is lost when moving back and forth); each step validates
 * only its own fields before advancing. The server re-validates everything.
 */
export function OnboardingWizard({ config }: { config: WizardConfig }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step);

  const form = useForm<OnboardingInput, unknown, OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      website: "",
      industry: "",
      businessType: "local",
      country: "",
      city: "",
      services: [],
      competitors: config.competitorLimit === 0 ? [] : [{ name: "", website: "" }],
      monitoring: {
        generateQueries: true,
        frequency: config.defaults.frequency,
        queryCount: config.defaults.queryCount,
        providers: config.defaults.providers,
      },
      runFirstScan: true,
    },
  });

  const { execute, pending } = useServerAction(createProjectAction, {
    successMessage: "Project created",
    onSuccess: (data) => {
      setRedirecting(true);
      if (data.note) {
        if (data.scanStarted) toast.info(data.note);
        else toast.warning(data.note);
      }
      router.push(`/projects/${data.projectId}`);
    },
    onError: (result) => {
      if (!result.fieldErrors) return;
      let target = -1;
      for (const [key, messages] of Object.entries(result.fieldErrors)) {
        if (key === "_" || !messages[0]) continue;
        form.setError(key as FieldPath<OnboardingInput>, { type: "server", message: messages[0] });
        const idx = stepOfField(key);
        if (idx >= 0 && (target < 0 || idx < target)) target = idx;
      }
      if (target >= 0) setStep(target);
    },
  });
  const busy = pending || redirecting;
  const [generate, runFirstScan, competitors] = useWatch({
    control: form.control,
    name: ["monitoring.generateQueries", "runFirstScan", "competitors"],
  });

  // Move focus to the new step's heading (not on the initial render).
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function dropBlankCompetitors() {
    const list = form.getValues("competitors") ?? [];
    const kept = list.filter((c) => c?.name?.trim() || c?.website?.trim());
    if (kept.length !== list.length) form.setValue("competitors", kept, { shouldDirty: true });
  }

  async function validateStep(index: number) {
    const current = WIZARD_STEPS[index];
    if (current.id === "competitors") dropBlankCompetitors();
    return form.trigger(current.fields as Array<FieldPath<OnboardingInput>>, { shouldFocus: index === step });
  }

  async function goTo(target: number) {
    if (target === step || target < 0 || target > LAST_STEP || busy) return;
    if (target > step) {
      for (let i = step; i < target; i++) {
        if (!(await validateStep(i))) {
          if (i !== step) setStep(i);
          return;
        }
      }
    } else if (step === WIZARD_STEPS.findIndex((s) => s.id === "competitors")) {
      dropBlankCompetitors();
    }
    setStep(target);
    setMaxReached((m) => Math.max(m, target));
  }

  const submit = form.handleSubmit(
    async (values) => {
      await execute({ ...values, runFirstScan: values.monitoring.generateQueries && values.runFirstScan });
    },
    (errors) => {
      const first = WIZARD_STEPS.findIndex((s) => s.fields.some((f) => f in errors));
      if (first >= 0 && first !== step) setStep(first);
    },
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (step < LAST_STEP) {
      void goTo(step + 1);
      return;
    }
    void submit(e);
  }

  const current = WIZARD_STEPS[step];
  const competitorCount = (competitors ?? []).filter((c) => c?.name?.trim() || c?.website?.trim()).length;
  const finishLabel = generate && runFirstScan !== false ? "Analyze My Business" : "Create Project";

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} noValidate aria-labelledby="ob-step-title" className="flex flex-col gap-6">
        <StepIndicator steps={WIZARD_STEPS} current={step} maxReached={maxReached} onSelect={(i) => void goTo(i)} disabled={busy} />

        <Card className="overflow-hidden">
          <CardHeader className="gap-1.5 border-b border-border p-5 sm:p-6">
            <p className="text-xs font-medium text-primary">
              Step {step + 1} of {WIZARD_STEPS.length}
            </p>
            <h2 id="ob-step-title" ref={headingRef} tabIndex={-1} className="text-lg font-semibold tracking-tight outline-none">
              {current.title}
            </h2>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{current.description}</p>
          </CardHeader>

          <CardContent className="p-5 sm:p-6">
            <fieldset
              key={current.id}
              disabled={busy}
              className="min-w-0 animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
            >
              {current.id === "business" && <StepBusiness />}
              {current.id === "services" && <StepServices />}
              {current.id === "competitors" && <StepCompetitors limit={config.competitorLimit} planName={config.planName} />}
              {current.id === "monitoring" && <StepMonitoring config={config} onEditStep={(i) => void goTo(i)} />}
            </fieldset>
          </CardContent>

          <CardFooter className="flex-col-reverse items-stretch gap-2 bg-surface-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:gap-3 sm:px-6">
            {step > 0 && (
              <Button type="button" variant="ghost" onClick={() => void goTo(step - 1)} disabled={busy}>
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
            )}
            {step === LAST_STEP ? (
              <Button type="submit" size="lg" loading={busy} className="sm:ml-auto sm:min-w-48">
                {!busy && <Sparkles aria-hidden="true" />}
                {busy ? "Creating project…" : finishLabel}
              </Button>
            ) : (
              <Button type="submit" disabled={busy} className="sm:ml-auto">
                {current.id === "competitors" && competitorCount === 0 ? "Skip for now" : "Continue"}
                <ArrowRight aria-hidden="true" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </FormProvider>
  );
}
