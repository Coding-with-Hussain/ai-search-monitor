"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { projectSettingsSchema } from "@/components/project-settings/schema";
import { getProjectForUser } from "@/db/repositories/projects";
import { runAction } from "@/lib/action-utils";
import { requireUserOrThrow } from "@/lib/auth/session";
import { forbidden, validationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { deleteProject, updateProjectSettings } from "@/services/projects/service";

const projectRef = z.object({ projectId: z.uuid("Invalid project.") });

function dedupe(values: string[]) {
  const seen = new Set<string>();
  return values.filter((v) => {
    const key = v.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Save business info, services, aliases and monitoring preferences. Monitoring
 * frequency is checked against the plan by `updateProjectSettings`.
 */
export async function updateProjectSettingsAction(input: unknown) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const { projectId } = projectRef.parse(input);
    const parsed = projectSettingsSchema.parse(input);
    const project = await getProjectForUser(user.id, projectId);
    const data = { ...parsed, aliases: dedupe(parsed.aliases), providers: [...new Set(parsed.providers)] };

    await updateProjectSettings(user.id, project, data);
    logger.info("project.settings_updated", { projectId: project.id, userId: user.id });
    revalidatePath(`/projects/${project.id}`, "layout");
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return { name: data.name };
  }, "projectSettings.update");
}

const deleteInput = projectRef.extend({ confirmName: z.string().max(200) });

/**
 * Permanently delete a project and all of its data (cascade). The user must
 * type the project name. Only the owner can delete. Redirects to /projects.
 */
export async function deleteProjectAction(input: z.input<typeof deleteInput>) {
  const result = await runAction(async () => {
    const user = await requireUserOrThrow();
    const { projectId, confirmName } = deleteInput.parse(input);
    const project = await getProjectForUser(user.id, projectId);
    if (project.userId !== user.id) throw forbidden("Only the project owner can delete this project.");
    if (confirmName.trim() !== project.name.trim()) {
      throw validationError("Type the project name exactly as shown to confirm.");
    }
    await deleteProject(user.id, project);
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return null;
  }, "projectSettings.delete");

  if (result.ok) redirect("/projects");
  return result;
}
