import { ArrowRight, Radar } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { listRecentNotifications } from "@/db/repositories/notifications";
import { getProjectScanMeta, type ProjectScanMeta } from "@/db/repositories/scans";
import { CreateProjectButton } from "@/components/account/create-project-button";
import { NotificationsCard } from "@/components/account/notifications-card";
import { ProjectCard } from "@/components/account/project-card";
import { ScoreFootnote } from "@/components/account/score-footnote";
import { UsageSummaryCard } from "@/components/account/usage-summary-card";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ensureUserRecords } from "@/db/repositories/profiles";
import { listProjectsForUser } from "@/db/repositories/projects";
import { getEntitlements, getUsageSummary } from "@/lib/billing/entitlements";
import { requireUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

export const metadata: Metadata = {
  title: "Dashboard",
};

/** Project cards shown on the dashboard before "View all". */
const DASHBOARD_PROJECT_LIMIT = 6;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("/dashboard");
  const [profile, projects, ent, params] = await Promise.all([
    ensureUserRecords(user),
    listProjectsForUser(user.id),
    getEntitlements(user.id),
    searchParams,
  ]);

  // New accounts go straight to setup, unless they just chose to exit it.
  const exitedOnboarding = params.from === "onboarding";
  if (projects.length === 0 && !profile?.onboardingCompletedAt && !exitedOnboarding) {
    redirect("/onboarding");
  }

  const [usage, scanMeta, notifications] = await Promise.all([
    getUsageSummary(user.id, ent),
    getProjectScanMeta(projects).catch((error: unknown) => {
      logger.warn("dashboard.scan_meta_failed", { error: (error as Error)?.message });
      return new Map<string, ProjectScanMeta>();
    }),
    listRecentNotifications(user.id, 8).catch((error: unknown) => {
      logger.warn("dashboard.notifications_failed", { error: (error as Error)?.message });
      return null;
    }),
  ]);

  const firstName = (profile?.fullName ?? user.fullName)?.trim().split(/\s+/)[0];
  const atLimit = usage.projectsUsed >= usage.projectsLimit;
  const inactiveReason = ent.active ? null : (ent.inactiveReason ?? "Your subscription is not active.");
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const shown = projects.slice(0, DASHBOARD_PROJECT_LIMIT);

  const createButton = (align: "end" | "center") => (
    <CreateProjectButton
      id={`dashboard-create-${align}`}
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
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description={
          projects.length
            ? "Your AI search visibility across every business you monitor."
            : "Set up a project to see how AI assistants answer your customers' questions."
        }
        actions={projects.length ? createButton("end") : undefined}
      />

      {!ent.active && (
        <Alert
          variant="danger"
          title="Monitoring is paused"
          className="mb-6"
          action={
            <Button size="sm" asChild>
              <Link href="/billing">Choose a plan</Link>
            </Button>
          }
        >
          {inactiveReason} Your projects and history are kept.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="dashboard-projects" className="min-w-0 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="dashboard-projects" className="text-[15px] font-semibold tracking-tight">
              Projects
              {projects.length > 0 && <span className="ml-1.5 font-normal text-subtle-foreground tabular">{projects.length}</span>}
            </h2>
            {projects.length > 0 && (
              <Link href="/projects" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
                {projects.length > shown.length ? `View all ${projects.length}` : "View all"}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>

          {projects.length === 0 ? (
            <EmptyState
              icon={Radar}
              title="Create your first project to start monitoring AI visibility."
              description="Add your business, services and competitors. We'll check how ChatGPT, Gemini and Perplexity answer the questions your customers ask."
              action={createButton("center")}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {shown.map((project) => (
                  <ProjectCard key={project.id} project={project} meta={scanMeta.get(project.id)} />
                ))}
              </div>
              <ScoreFootnote />
            </>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <UsageSummaryCard usage={usage} ent={ent} />
          <NotificationsCard notifications={notifications} projectNames={projectNames} />
        </div>
      </div>
    </>
  );
}
