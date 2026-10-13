import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { authLinkClass } from "@/components/auth/auth-card";
import { AuthNotConfigured } from "@/components/auth/auth-not-configured";
import { SignupForm } from "@/components/auth/signup-form";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { firstParam, parsePlanIntent } from "@/schemas/auth";

export const metadata: Metadata = {
  title: "Create your account",
  description: `Start monitoring your AI search visibility across ChatGPT, Gemini and Perplexity. ${TRIAL_DAYS}-day free trial, no card required.`,
  alternates: { canonical: "/signup" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawPlan = firstParam(params.plan);
  const rawInterval = firstParam(params.interval);
  const intent = parsePlanIntent(rawPlan, rawInterval);

  const notice = (
    <>
      {!isSupabaseConfigured && <AuthNotConfigured />}
      {intent && (
        <div className="mb-6 flex gap-3 rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 text-[13px] text-primary-soft-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">
            <span className="font-medium text-foreground">
              You picked {intent.plan.name}
              {intent.interval === "year" ? " (annual)" : ""}
            </span>{" "}
            — start with a {TRIAL_DAYS}-day free trial, no card required.{" "}
            <Link href="/pricing" className={authLinkClass}>
              Change plan
            </Link>
          </p>
        </div>
      )}
    </>
  );

  return (
    <SignupForm
      plan={intent ? intent.plan.id : undefined}
      interval={intent ? intent.interval : undefined}
      disabled={!isSupabaseConfigured}
      notice={notice}
      trialDays={TRIAL_DAYS}
    />
  );
}
