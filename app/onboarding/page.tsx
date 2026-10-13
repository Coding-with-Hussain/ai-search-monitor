import type { Metadata } from "next";

import { OnboardingBlocked } from "@/components/onboarding/onboarding-blocked";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { FREQUENCY_LABEL } from "@/components/onboarding/constants";
import { MAX_QUERY_COUNT, MIN_QUERY_COUNT } from "@/components/onboarding/schema";
import type { FrequencyOption, WizardConfig } from "@/components/onboarding/types";
import { DEFAULT_MONITORING_DEFAULTS, ensureUserRecords } from "@/db/repositories/profiles";
import { getEntitlements, getUsageSummary } from "@/lib/billing/entitlements";
import { nextPlan, PLAN_IDS, PLANS } from "@/lib/billing/plans";
import { requireUser } from "@/lib/auth/session";
import { features } from "@/lib/env";
import { MONITORING_FREQUENCIES, type MonitoringFrequency, PROVIDER_IDS, type ProviderId } from "@/types/domain";

export const metadata: Metadata = {
  title: "Set up monitoring",
};

function requiredPlanFor(frequency: MonitoringFrequency) {
  const id = PLAN_IDS.find((p) => PLANS[p].limits.monitoringFrequencies.includes(frequency));
  return id ? PLANS[id].name : null;
}

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  const [profile, ent] = await Promise.all([ensureUserRecords(user), getEntitlements(user.id)]);
  const usage = await getUsageSummary(user.id, ent);
  const plan = ent.plan;

  if (!ent.active) {
    return (
      <OnboardingBlocked
        kind="inactive"
        title="Choose a plan to create a project"
        message={ent.inactiveReason ?? "Your subscription is not active. Choose a plan to resume monitoring."}
      />
    );
  }

  if (usage.projectsUsed >= usage.projectsLimit) {
    const upgrade = nextPlan(plan.id);
    const limit = plan.limits.projects;
    return (
      <OnboardingBlocked
        kind="limit"
        title={`Your ${plan.name} plan includes ${limit} project${limit === 1 ? "" : "s"}`}
        message={`You're already monitoring ${usage.projectsUsed} of ${limit}. Upgrade your plan to monitor another business, or manage your existing projects from the dashboard.`}
        nextPlanHint={
          upgrade
            ? `${upgrade.name} includes ${upgrade.limits.projects} projects and ${upgrade.limits.queriesPerMonth.toLocaleString("en-US")} queries per month.`
            : null
        }
      />
    );
  }

  const allowed = plan.limits.monitoringFrequencies;
  const frequencyOptions: FrequencyOption[] = MONITORING_FREQUENCIES.map((value) => ({
    value,
    label: FREQUENCY_LABEL[value],
    allowed: allowed.includes(value),
    requiredPlan: allowed.includes(value) ? null : requiredPlanFor(value),
  }));

  const saved = profile?.monitoringDefaults ?? DEFAULT_MONITORING_DEFAULTS;
  const savedProviders = (saved.providers ?? []).filter((p): p is ProviderId => (PROVIDER_IDS as readonly string[]).includes(p));
  const savedCount = Number.isFinite(saved.queryCount) ? saved.queryCount : DEFAULT_MONITORING_DEFAULTS.queryCount;

  const config: WizardConfig = {
    planName: plan.name,
    competitorLimit: plan.limits.competitorsPerProject,
    frequencyOptions,
    queriesPerMonth: plan.limits.queriesPerMonth,
    remainingQueries: Math.max(0, usage.queriesLimit - usage.queriesUsed),
    defaults: {
      frequency: allowed.includes(saved.frequency) ? saved.frequency : "weekly",
      queryCount: Math.min(MAX_QUERY_COUNT, Math.max(MIN_QUERY_COUNT, Math.round(savedCount))),
      providers: savedProviders.length ? savedProviders : [...PROVIDER_IDS],
    },
    mockMode: features.mockMode(),
    isFirstProject: usage.projectsUsed === 0,
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[13px] font-medium text-primary">{config.isFirstProject ? "Welcome" : "New project"}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
          {config.isFirstProject ? "Let's check your AI visibility" : "Monitor another business"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Tell us about the business. We&apos;ll create the questions buyers ask AI assistants, then check whether ChatGPT,
          Gemini and Perplexity mention you, recommend you, or point people to a competitor. Setup takes about two minutes.
        </p>
      </div>
      <OnboardingWizard config={config} />
    </div>
  );
}
