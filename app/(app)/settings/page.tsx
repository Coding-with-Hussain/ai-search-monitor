import type { Metadata } from "next";

import { PageHeader } from "@/components/app/page-header";
import type { BillingState } from "@/components/billing/billing-status";
import { AccountSection } from "@/components/settings/account-section";
import { BillingSummary } from "@/components/settings/billing-summary";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { type DefaultFrequencyOption, MonitoringDefaultsForm } from "@/components/settings/monitoring-defaults-form";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { PrivacySection } from "@/components/settings/privacy-section";
import { ProfileForm } from "@/components/settings/profile-form";
import { MAX_DEFAULT_QUERIES, MIN_DEFAULT_QUERIES } from "@/components/settings/schemas";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_MONITORING_DEFAULTS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  ensureUserRecords,
} from "@/db/repositories/profiles";
import { requireUser } from "@/lib/auth/session";
import { getEntitlements, getUsageSummary } from "@/lib/billing/entitlements";
import { PLAN_IDS, PLANS } from "@/lib/billing/plans";
import { features } from "@/lib/env";
import { logger } from "@/lib/logger";
import { siteConfig } from "@/lib/site";
import { getBillingRow } from "@/services/billing/account";
import { isLiveStatus } from "@/services/billing/status";
import { MONITORING_FREQUENCIES, PROVIDER_IDS, type ProviderId } from "@/types/domain";

export const metadata: Metadata = { title: "Settings" };

function plansWith(frequency: (typeof MONITORING_FREQUENCIES)[number]) {
  const names = PLAN_IDS.filter((id) => PLANS[id].limits.monitoringFrequencies.includes(frequency)).map((id) => PLANS[id].name);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
}

async function loadSettings(user: { id: string; email: string; fullName: string | null }) {
  const [profile, ent, row] = await Promise.all([ensureUserRecords(user), getEntitlements(user.id), getBillingRow(user.id)]);
  const usage = await getUsageSummary(user.id, ent);
  return { profile, ent, row, usage };
}

export default async function SettingsPage() {
  const user = await requireUser("/settings");

  let data: Awaited<ReturnType<typeof loadSettings>>;
  try {
    data = await loadSettings(user);
  } catch (error) {
    logger.error("settings.page_load_failed", { error: (error as Error).message });
    return (
      <>
        <PageHeader title="Settings" />
        <Alert
          variant="danger"
          title="We couldn't load your settings"
          action={
            <Button asChild size="sm" variant="outline">
              <a href="/settings">Try again</a>
            </Button>
          }
        >
          Something went wrong on our side. Please try again in a moment.
        </Alert>
      </>
    );
  }

  const { profile, ent, row, usage } = data;
  const notificationDefaults = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(profile?.notificationPreferences ?? {}) };

  const allowed = ent.plan.limits.monitoringFrequencies;
  const frequencyOptions: DefaultFrequencyOption[] = MONITORING_FREQUENCIES.map((value) => ({
    value,
    allowed: allowed.includes(value),
    availableOn: allowed.includes(value) ? undefined : plansWith(value),
  }));
  const saved = profile?.monitoringDefaults ?? DEFAULT_MONITORING_DEFAULTS;
  const savedProviders = (saved.providers ?? []).filter((p): p is ProviderId => (PROVIDER_IDS as readonly string[]).includes(p));
  const savedCount = Number.isFinite(saved.queryCount) ? Math.round(saved.queryCount) : DEFAULT_MONITORING_DEFAULTS.queryCount;
  const monitoringDefaults = {
    frequency: allowed.includes(saved.frequency) ? saved.frequency : DEFAULT_MONITORING_DEFAULTS.frequency,
    queryCount: Math.min(MAX_DEFAULT_QUERIES, Math.max(MIN_DEFAULT_QUERIES, savedCount)),
    providers: savedProviders.length ? savedProviders : [...PROVIDER_IDS],
  };

  const billingState: BillingState = {
    status: ent.status,
    active: ent.active,
    isTrial: ent.isTrial,
    trialEndsAt: ent.trialEndsAt,
    cancelAtPeriodEnd: ent.cancelAtPeriodEnd,
    hasStripeSubscription: ent.hasStripeSubscription,
    currentPeriodEnd: row?.currentPeriodEnd ?? null,
  };
  const hasPaidSubscription = Boolean(row?.stripeSubscriptionId) && isLiveStatus(ent.status);

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, sign-in, notifications and defaults for new projects." />

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <SettingsNav />

        <div className="flex min-w-0 flex-col gap-6">
          <ProfileForm
            defaults={{ fullName: profile?.fullName ?? user.fullName ?? "", company: profile?.company ?? "" }}
            whiteLabel={ent.plan.features.whiteLabelReports}
          />
          <AccountSection email={user.email} supportEmail={siteConfig.supportEmail} />
          <NotificationSettings defaults={notificationDefaults} emailEnabled={features.email()} />
          <MonitoringDefaultsForm defaults={monitoringDefaults} frequencyOptions={frequencyOptions} planName={ent.plan.name} />
          <BillingSummary planName={ent.plan.name} state={billingState} usage={usage} />
          <PrivacySection supportEmail={siteConfig.supportEmail} />
          <DeleteAccountSection
            available={features.serviceRole()}
            unavailableReason="Account deletion isn't configured in this environment (SUPABASE_SERVICE_ROLE_KEY is missing). Please contact support to delete your account."
            hasPaidSubscription={hasPaidSubscription}
            projectCount={usage.projectsUsed}
          />
        </div>
      </div>
    </>
  );
}
