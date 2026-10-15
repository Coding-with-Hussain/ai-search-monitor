"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProjectForUser, listCompetitors } from "@/db/repositories/projects";
import { runAction } from "@/lib/action-utils";
import { requireUserOrThrow } from "@/lib/auth/session";
import { assertActive, getEntitlements } from "@/lib/billing/entitlements";
import { notFound } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { competitorInputSchema } from "@/schemas/project";
import { addCompetitor, removeCompetitor } from "@/services/projects/service";

const addInput = competitorInputSchema.extend({ projectId: z.uuid("Invalid project.") });

/** Track a new competitor. Plan limits are enforced by `addCompetitor` (PLAN_LIMIT -> upgrade dialog). */
export async function addCompetitorAction(input: z.input<typeof addInput>) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const data = addInput.parse(input);
    const project = await getProjectForUser(user.id, data.projectId);
    assertActive(await getEntitlements(user.id));
    const row = await addCompetitor(project, { name: data.name, website: data.website });
    logger.info("competitor.added", { projectId: project.id, competitorId: row.id });
    revalidatePath(`/projects/${project.id}`, "layout");
    return { id: row.id, name: row.name };
  }, "competitors.add");
}

const removeInput = z.object({ projectId: z.uuid("Invalid project."), competitorId: z.uuid("Invalid competitor.") });

/** Stop tracking a competitor. Past scan snapshots are kept unchanged. */
export async function removeCompetitorAction(input: z.input<typeof removeInput>) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const data = removeInput.parse(input);
    const project = await getProjectForUser(user.id, data.projectId);
    const existing = (await listCompetitors(project)).find((c) => c.id === data.competitorId);
    if (!existing) throw notFound("This competitor is no longer tracked.");
    await removeCompetitor(project, existing.id);
    logger.info("competitor.removed", { projectId: project.id, competitorId: existing.id });
    revalidatePath(`/projects/${project.id}`, "layout");
    return { id: existing.id, name: existing.name };
  }, "competitors.remove");
}
