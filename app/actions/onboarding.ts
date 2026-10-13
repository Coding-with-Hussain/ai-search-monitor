"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import type { CreateProjectResult } from "@/components/onboarding/types";
import { onboardingSchema } from "@/components/onboarding/schema";
import type { AuthorizedProject } from "@/db/repositories/projects";
import { countActiveQueries, countQueries } from "@/db/repositories/queries";
import { runAction } from "@/lib/action-utils";
import { track } from "@/lib/analytics/server";
import { requireUserOrThrow } from "@/lib/auth/session";
import { isAppError } from "@/lib/errors";
import { enqueueScan } from "@/lib/jobs/runner";
import { logger } from "@/lib/logger";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createProjectWithSetup } from "@/services/projects/service";
import { createScan } from "@/services/scans/pipeline";

function dedupeCaseInsensitive(values: string[]) {
  const seen = new Set<string>();
  return values.filter((v) => {
    const key = v.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const SCAN_NOT_STARTED = "Your project is ready, but the first scan didn't start. You can run it from the project page.";

type OnboardingData = z.output<typeof onboardingSchema>;

/** Analytics + optional first scan for a freshly created project. */
async function finishSetup(userId: string, project: AuthorizedProject, data: OnboardingData) {
  const [queryCount, activeQueries] = await Promise.all([countQueries(project), countActiveQueries(project)]);

  await Promise.all([
    track("project_created", userId, {
      projectId: project.id,
      businessType: project.businessType,
      competitors: data.competitors.length,
      services: data.services.length,
      providers: data.monitoring.providers.length,
      frequency: data.monitoring.frequency,
    }),
    track("onboarding_completed", userId, { projectId: project.id, generateQueries: data.monitoring.generateQueries }),
    queryCount > 0 ? track("query_generated", userId, { projectId: project.id, count: queryCount, source: "onboarding" }) : null,
  ]);

  if (!data.runFirstScan) return { scanStarted: false, scanId: null, note: null };
  if (activeQueries === 0) {
    return {
      scanStarted: false,
      scanId: null,
      note: "Your project is ready. Add questions on the Questions tab, then run your first scan.",
    };
  }

  try {
    const scan = await createScan({ project, userId, trigger: "onboarding" });
    const driver = await enqueueScan(scan.id);
    await track("scan_started", userId, { projectId: project.id, mode: scan.mode, queries: scan.queryCount, driver, trigger: "onboarding" });
    // e.g. "Limited to your N remaining monthly queries…"
    return { scanStarted: true, scanId: scan.id, note: scan.notes[0] ?? null };
  } catch (error) {
    if (isAppError(error)) {
      return { scanStarted: false, scanId: null, note: `Your project is ready, but the first scan didn't start: ${error.message}` };
    }
    throw error;
  }
}

/**
 * Create a project from the onboarding wizard, generate its buyer questions
 * and (optionally) start the first scan. Plan limits (projects, competitors,
 * monitoring frequency, monthly queries) are enforced by the services. Once
 * the project exists the action always succeeds; when the first scan cannot
 * start, a note explains why.
 */
export async function createProjectAction(input: unknown) {
  return runAction<CreateProjectResult>(async () => {
    const user = await requireUserOrThrow();
    await enforceRateLimit(`project:create:${user.id}`, RATE_LIMITS.createProject.limit, RATE_LIMITS.createProject.windowSeconds);
    const parsed = onboardingSchema.parse(input);
    const data = { ...parsed, services: dedupeCaseInsensitive(parsed.services) };

    const project = await createProjectWithSetup(user.id, data);
    revalidatePath("/dashboard");
    revalidatePath("/projects");

    // Failing from here would invite a retry that creates a duplicate project.
    try {
      return { projectId: project.id, ...(await finishSetup(user.id, project, data)) };
    } catch (error) {
      logger.error("onboarding.finish_setup_failed", { projectId: project.id, error: (error as Error)?.message });
      return { projectId: project.id, scanStarted: false, scanId: null, note: data.runFirstScan ? SCAN_NOT_STARTED : null };
    }
  }, "onboarding.createProject");
}
