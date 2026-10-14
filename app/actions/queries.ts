"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { type AuthorizedProject, getProjectForUser } from "@/db/repositories/projects";
import {
  countQueries,
  deleteQueries,
  insertQueries,
  listQueryTexts,
  MAX_QUERIES_PER_PROJECT,
  setQueryPriority,
  setQueryStatus,
} from "@/db/repositories/queries";
import { runAction } from "@/lib/action-utils";
import { track } from "@/lib/analytics/server";
import { requireUserOrThrow } from "@/lib/auth/session";
import { assertActive, getEntitlements } from "@/lib/billing/entitlements";
import { conflict, validationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { addQuerySchema } from "@/schemas/project";
import { regenerateQueries } from "@/services/projects/service";
import { isNearDuplicate } from "@/services/queries/generator";
import { PRIORITIES } from "@/types/domain";

const projectIdSchema = z.uuid("Invalid project.");
const queryIdsSchema = z
  .array(z.uuid("Invalid question."))
  .min(1, "Select at least one question.")
  .max(200, "You can update up to 200 questions at a time.");

/** Questions, overview, header (active-question count) and history all derive from queries. */
function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
}

async function loadProject(projectId: unknown): Promise<{ userId: string; project: AuthorizedProject }> {
  const user = await requireUserOrThrow();
  const id = projectIdSchema.parse(projectId);
  const project = await getProjectForUser(user.id, id);
  return { userId: user.id, project };
}

const addQueryInput = addQuerySchema.extend({ projectId: projectIdSchema });

/** Add one buyer question manually. Rejects exact and near-duplicates. */
export async function addQueryAction(input: z.input<typeof addQueryInput>) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const data = addQueryInput.parse(input);
    const project = await getProjectForUser(user.id, data.projectId);
    assertActive(await getEntitlements(user.id));

    if (data.service && !project.services.some((s) => s.toLowerCase() === data.service!.toLowerCase())) {
      throw validationError("Choose one of this project's products or services.");
    }

    const [existingCount, existingTexts] = await Promise.all([countQueries(project), listQueryTexts(project)]);
    if (existingCount >= MAX_QUERIES_PER_PROJECT) {
      throw validationError(
        `A project can monitor up to ${MAX_QUERIES_PER_PROJECT} questions. Delete questions you no longer need to add new ones.`,
      );
    }
    if (isNearDuplicate(data.text, existingTexts)) {
      throw conflict("A very similar question is already being monitored. Try a different wording or angle.");
    }

    const service = data.service ? (project.services.find((s) => s.toLowerCase() === data.service!.toLowerCase()) ?? null) : null;
    const [inserted] = await insertQueries(project, [
      { text: data.text, category: data.category, priority: data.priority, service, source: "manual" },
    ]);
    if (!inserted) throw conflict("This question is already being monitored.");

    logger.info("query.added", { projectId: project.id, queryId: inserted.id });
    revalidateProject(project.id);
    return { id: inserted.id };
  }, "queries.add");
}

const deleteInput = z.object({ projectId: projectIdSchema, queryIds: queryIdsSchema });

/** Delete questions (past scan results are kept; they just lose the link). */
export async function deleteQueriesAction(input: z.input<typeof deleteInput>) {
  return runAction(async () => {
    const data = deleteInput.parse(input);
    const { project } = await loadProject(data.projectId);
    const ids = [...new Set(data.queryIds)];
    await deleteQueries(project, ids);
    logger.info("query.deleted", { projectId: project.id, count: ids.length });
    revalidateProject(project.id);
    return { count: ids.length };
  }, "queries.delete");
}

const statusInput = z.object({
  projectId: projectIdSchema,
  queryIds: queryIdsSchema,
  status: z.enum(["active", "paused"]),
});

/** Pause or resume monitoring for one or more questions. */
export async function setQueriesStatusAction(input: z.input<typeof statusInput>) {
  return runAction(async () => {
    const data = statusInput.parse(input);
    const { project } = await loadProject(data.projectId);
    const ids = [...new Set(data.queryIds)];
    await setQueryStatus(project, ids, data.status);
    revalidateProject(project.id);
    return { count: ids.length, status: data.status };
  }, "queries.setStatus");
}

const priorityInput = z.object({
  projectId: projectIdSchema,
  queryId: z.uuid("Invalid question."),
  priority: z.enum(PRIORITIES),
});

/** Change a question's priority (high-priority questions are checked first when usage runs low). */
export async function setQueryPriorityAction(input: z.input<typeof priorityInput>) {
  return runAction(async () => {
    const data = priorityInput.parse(input);
    const { project } = await loadProject(data.projectId);
    await setQueryPriority(project, data.queryId, data.priority);
    revalidateProject(project.id);
    return { priority: data.priority };
  }, "queries.setPriority");
}

const generateInput = z.object({
  projectId: projectIdSchema,
  count: z.union([z.literal(5), z.literal(10), z.literal(20)], { error: "Choose 5, 10 or 20 questions." }),
});

/** Generate more buyer-intent questions; returns how many new unique ones were added. */
export async function generateQueriesAction(input: z.input<typeof generateInput>) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const data = generateInput.parse(input);
    const project = await getProjectForUser(user.id, data.projectId);
    assertActive(await getEntitlements(user.id));
    await enforceRateLimit(
      `queries:generate:${user.id}`,
      RATE_LIMITS.generateQueries.limit,
      RATE_LIMITS.generateQueries.windowSeconds,
      "You've generated questions many times in the last hour. Please try again later.",
    );

    const existing = await countQueries(project);
    if (existing >= MAX_QUERIES_PER_PROJECT) {
      throw validationError(
        `This project already has the maximum of ${MAX_QUERIES_PER_PROJECT} questions. Delete some before generating more.`,
      );
    }

    const added = await regenerateQueries(project, data.count);
    // Analytics must never delay or fail the response.
    after(() => track("query_generated", user.id, { projectId: project.id, requested: data.count, count: added, source: "questions_page" }));
    if (added > 0) revalidateProject(project.id);
    return { added, requested: data.count };
  }, "queries.generate");
}
