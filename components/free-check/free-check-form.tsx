"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Radar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { runFreeCheckAction } from "@/app/actions/free-check";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { trackClient } from "@/lib/analytics/client";
import { freeCheckSchema, type FreeCheckInput } from "@/schemas/free-check";
import type { FreeCheckResult } from "@/types/free-check";

import { FreeCheckResults } from "./free-check-results";

const STEPS = ["Building buyer questions for your business…", "Asking AI assistants…", "Analyzing every answer…", "Calculating your score…"];

const TYPE_OPTIONS = [
  { value: "local", label: "Local business (clinic, restaurant, trade…)" },
  { value: "saas", label: "SaaS / software" },
  { value: "ecommerce", label: "E-commerce / online store" },
  { value: "services", label: "Services, agency or consultancy" },
] as const;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="text-[13px] text-danger-text">
      {message}
    </p>
  );
}

export function FreeCheckForm({ simulated }: { simulated: boolean }) {
  const [result, setResult] = useState<FreeCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const form = useForm<FreeCheckInput>({
    resolver: zodResolver(freeCheckSchema),
    defaultValues: { businessName: "", website: "", industry: "", businessType: "local", city: "", country: "", company: "" },
  });
  const { register, handleSubmit, formState, control } = form;
  const errors = formState.errors;
  const isLocal = useWatch({ control, name: "businessType" }) === "local";

  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1100);
    return () => clearInterval(t);
  }, [pending]);

  useEffect(() => {
    if (result) resultsRef.current?.focus();
  }, [result]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setStep(0);
    setPending(true);
    try {
      const res = await runFreeCheckAction(values);
      if (res.ok) {
        setResult(res.data.result);
        trackClient("free_check_completed", { score: res.data.result.score, simulated: res.data.result.isSimulation });
      } else {
        setError(res.error);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  });

  if (result) {
    return (
      <div ref={resultsRef} tabIndex={-1} className="outline-none">
        <FreeCheckResults
          result={result}
          onReset={() => {
            setResult(null);
            form.reset();
          }}
        />
      </div>
    );
  }

  const field = (id: keyof FreeCheckInput) => ({
    id: `fc-${id}`,
    "aria-invalid": errors[id] ? true : undefined,
    "aria-describedby": errors[id] ? `fc-${id}-error` : undefined,
  });

  return (
    <Card className="p-5 sm:p-7">
      {pending ? (
        <div className="flex flex-col items-center py-10 text-center" role="status" aria-live="polite">
          <div className="relative mb-6 flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping-soft" aria-hidden="true" />
            <Radar className="size-7 animate-radar" aria-hidden="true" />
          </div>
          <p className="font-medium">{STEPS[step]}</p>
          <p className="mt-1 text-sm text-muted-foreground">This usually takes a few seconds.</p>
          <ol className="mt-6 w-full max-w-xs space-y-2 text-left text-[13px]">
            {STEPS.map((s, i) => (
              <li key={s} className={i <= step ? "text-foreground" : "text-subtle-foreground"}>
                {i < step ? "✓" : i === step ? "•" : "○"} {s.replace("…", "")}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" aria-label="Free AI visibility check">
          {error && (
            <Alert variant="danger" title="We couldn't run the check">
              {error}
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fc-businessName">Business name</Label>
            <Input placeholder="e.g. ABC Dental" autoComplete="organization" {...field("businessName")} {...register("businessName")} />
            <FieldError id="fc-businessName" message={errors.businessName?.message} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fc-website">
                Website <span className="font-normal text-subtle-foreground">(optional)</span>
              </Label>
              <Input placeholder="example.com" inputMode="url" autoComplete="url" {...field("website")} {...register("website")} />
              <FieldError id="fc-website" message={errors.website?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fc-industry">Industry</Label>
              <Input placeholder="e.g. Dentist, CRM software" {...field("industry")} {...register("industry")} />
              <FieldError id="fc-industry" message={errors.industry?.message} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fc-businessType">Business type</Label>
            <NativeSelect {...field("businessType")} {...register("businessType")}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fc-city">
                City {!isLocal && <span className="font-normal text-subtle-foreground">(optional)</span>}
              </Label>
              <Input placeholder="e.g. Lahore" autoComplete="address-level2" {...field("city")} {...register("city")} />
              <FieldError id="fc-city" message={errors.city?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fc-country">
                Country <span className="font-normal text-subtle-foreground">(optional)</span>
              </Label>
              <Input placeholder="e.g. Pakistan" autoComplete="country-name" {...field("country")} {...register("country")} />
            </div>
          </div>
          {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="fc-company">Company</label>
            <input id="fc-company" tabIndex={-1} autoComplete="off" {...register("company")} />
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto sm:self-start">
            Check My AI Visibility <ArrowRight />
          </Button>
          <p className="text-xs text-muted-foreground">
            {simulated
              ? "This preview uses simulated AI answers analyzed by our real scoring engine. Live monitoring queries ChatGPT, Gemini and Perplexity."
              : "We ask a few buyer questions to an AI assistant and analyze the answers. Limited free checks per day."}{" "}
            No signup needed. We don&apos;t store your IP address.
          </p>
        </form>
      )}
    </Card>
  );
}
