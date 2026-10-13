"use server";

import { revalidatePath } from "next/cache";

import { updateProfile } from "@/db/repositories/profiles";
import { runAction } from "@/lib/action-utils";
import { requireUserOrThrow } from "@/lib/auth/session";

/**
 * Mark the dashboard product tour as seen (finished or skipped) for the
 * signed-in user. Takes no input: the user id always comes from the session.
 */
export async function completeTourAction() {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    await updateProfile(user.id, { tourCompletedAt: new Date() });
    revalidatePath("/projects/[projectId]", "page");
    return null;
  }, "tour.complete");
}
