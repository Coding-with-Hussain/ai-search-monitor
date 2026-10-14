import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeleteProjectCard } from "@/components/project-settings/delete-project-card";
import type { ProjectSettingsInput } from "@/components/project-settings/schema";
import { type FrequencyOption, ProjectSettingsForm } from "@/components/project-settings/settings-form";
import { RetryButton } from "@/components/queries/retry-button";
import { SectionHeader } from "@/components/queries/section-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getProjectForUser } from "@/db/repositories/projects";
import { countActiveQueries } from "@/db/repositories/queries";
import { requireUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import { PLAN_IDS, PLANS } from "@/lib/billing/plans";
import { features } from "@/lib/env";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { providerStatuses } from "@/services/ai/providers/registry";
import { BUSINESS_TYPES, MONITORING_FREQUENCIES, PROVIDER_IDS, type ProviderId } from "@/types/domain";

export const metadata: Metadata = { title: "Project settings" };

function plansWith(frequency: (typeof MONITORING_FREQUENCIES)[number]) {
  const names = PLAN_IDS.filter((id) => PLANS[id].limits.monitoringFrequencies.includes(frequency)).map((id) => PLANS[id].name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function unconfiguredProviders(mockMode: boolean): ProviderId[] {
  if (mockMode) return [];
  try {
    return providerStatuses()
      .filter((s) => !s.configured)
      .map((s) => s.id);
  } catch (error) {
    logger.warn("project_settings.provider_status_failed", { error: (error as Error).message });
    return [];
  }
}

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await getProjectForUser(user.id, projectId).catch((error) => {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  const header = (
    <SectionHeader
      title="Project settings"
      description="Update the business details, products and monitoring preferences used for this project's AI visibility checks."
      actions={project.isDemo ? <Badge variant="demo">Demo project</Badge> : undefined}
    />
  );

  let loaded;
  try {
    const [ent, activeQuestions] = await Promise.all([getEntitlements(user.id), countActiveQueries(project)]);
    loaded = { ent, activeQuestions };
  } catch (error) {
    logger.error("project_settings.load_failed", { projectId: project.id, error: (error as Error).message });
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {header}
        <Alert variant="danger" title="We couldn't load your project settings" action={<RetryButton />}>
          Something went wrong while loading this page. Please try again.
        </Alert>
      </div>
    );
  }
  const { ent, activeQuestions } = loaded;
  const mockMode = features.mockMode();

  const frequencyOptions: FrequencyOption[] = MONITORING_FREQUENCIES.map((value) => {
    const allowed = ent.plan.limits.monitoringFrequencies.includes(value);
    return { value, allowed, availableOn: allowed ? undefined : plansWith(value) };
  });

  const defaults: ProjectSettingsInput = {
    name: project.name,
    website: project.website ?? "",
    industry: project.industry,
    businessType: (BUSINESS_TYPES as readonly string[]).includes(project.businessType) ? project.businessType : "local",
    country: project.country ?? "",
    city: project.city ?? "",
    description: project.description ?? "",
    services: project.services,
    aliases: project.aliases,
    monitoringFrequency: project.monitoringFrequency,
    monitoringEnabled: project.monitoringEnabled,
    providers: PROVIDER_IDS.filter((p) => project.providers.includes(p)),
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {header}
      <ProjectSettingsForm
        projectId={project.id}
        defaults={defaults}
        frequencyOptions={frequencyOptions}
        planName={ent.plan.name}
        queriesPerMonth={ent.plan.limits.queriesPerMonth}
        activeQuestions={activeQuestions}
        mockMode={mockMode}
        unconfiguredProviders={unconfiguredProviders(mockMode)}
      />
      <DeleteProjectCard projectId={project.id} projectName={project.name} isOwner={project.userId === user.id} isDemo={project.isDemo} />
    </div>
  );
}
