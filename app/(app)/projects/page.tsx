import { FolderKanban } from "lucide-react";
import type { Metadata } from "next";

import { getProjectScanMeta, type ProjectScanMeta } from "@/db/repositories/scans";
import { CreateProjectButton } from "@/components/account/create-project-button";
import { ProjectCard } from "@/components/account/project-card";
import { ScoreFootnote } from "@/components/account/score-footnote";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { listProjectsForUser } from "@/db/repositories/projects";
import { getEntitlements, getUsageSummary } from "@/lib/billing/entitlements";
import { requireUser } from "@/lib/auth/session";
import { pluralize } from "@/lib/format";
import { logger } from "@/lib/logger";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage() {
  const user = await requireUser("/projects");
  const [projects, ent] = await Promise.all([listProjectsForUser(user.id), getEntitlements(user.id)]);
  const [usage, scanMeta] = await Promise.all([
    getUsageSummary(user.id, ent),
    getProjectScanMeta(projects).catch((error: unknown) => {
      logger.warn("projects.scan_meta_failed", { error: (error as Error)?.message });
      return new Map<string, ProjectScanMeta>();
    }),
  ]);

  const atLimit = usage.projectsUsed >= usage.projectsLimit;
  const inactiveReason = ent.active ? null : (ent.inactiveReason ?? "Your subscription is not active.");
  const createButton = (align: "end" | "center") => (
    <CreateProjectButton
      id={`projects-create-${align}`}
      atLimit={atLimit}
      inactiveReason={inactiveReason}
      planName={ent.plan.name}
      projectLimit={usage.projectsLimit}
      align={align}
    />
  );

  return (
    <>
      <PageHeader
        title="Projects"
        description={`Each project monitors one business. You're using ${usage.projectsUsed} of ${pluralize(usage.projectsLimit, "project")} on your ${ent.plan.name} plan.`}
        actions={projects.length ? createButton("end") : undefined}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project for each business you want to monitor. We'll generate the questions buyers ask AI assistants and track whether your business is mentioned."
          action={createButton("center")}
        />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Your projects">
            {projects.map((project) => (
              <li key={project.id} className="min-w-0">
                <ProjectCard project={project} meta={scanMeta.get(project.id)} detailed headingLevel="h2" />
              </li>
            ))}
          </ul>
          <ScoreFootnote />
        </>
      )}
    </>
  );
}
