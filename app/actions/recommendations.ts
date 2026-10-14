"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProjectForUser } from "@/db/repositories/projects";
import {
  BASIC_RECOMMENDATIONS_VISIBLE,
  getRecommendation,
  listOpenRecommendationIds,
  RECOMMENDATION_STATUSES,
  setRecommendationStatus,
} from "@/db/repositories/recommendations";
import { runAction } from "@/lib/action-utils";
import { requireUserOrThrow } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import { PLAN_IDS, PLANS } from "@/lib/billing/plans";
import { planLimitError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const statusInput = z.object({
  projectId: z.uuid("Invalid project."),
  recommendationId: z.uuid("Invalid recommendation."),
  status: z.enum(RECOMMENDATION_STATUSES),
});

/**
 * Mark a recommendation complete, dismiss it, or reopen it. The update is
 * scoped to the verified project; completedAt / dismissedAt follow the status.
 */
export async function setRecommendationStatusAction(input: z.input<typeof statusInput>) {
  return runAction(async () => {
    const user = await requireUserOrThrow();
    const data = statusInput.parse(input);
    const project = await getProjectForUser(user.id, data.projectId);
    const current = await getRecommendation(project, data.recommendationId);

    // Plans without advanced recommendations only unlock the top open ones.
    if (current.status === "open" && data.status !== "open") {
      const ent = await getEntitlements(user.id);
      if (!ent.plan.features.advancedRecommendations) {
        const unlocked = (await listOpenRecommendationIds(project)).slice(0, BASIC_RECOMMENDATIONS_VISIBLE);
        if (!unlocked.includes(current.id)) {
          const upgrade = PLAN_IDS.map((id) => PLANS[id]).find((p) => p.features.advancedRecommendations);
          throw planLimitError(
            `Your ${ent.plan.name} plan includes your top ${BASIC_RECOMMENDATIONS_VISIBLE} recommendations. Upgrade${
              upgrade ? ` to ${upgrade.name}` : ""
            } to unlock advanced recommendations.`,
            { limit: "recommendations", used: BASIC_RECOMMENDATIONS_VISIBLE, max: BASIC_RECOMMENDATIONS_VISIBLE, plan: ent.plan.id },
          );
        }
      }
    }

    const updated = current.status === data.status ? current : await setRecommendationStatus(project, current.id, data.status);
    logger.info("recommendation.status_changed", {
      projectId: project.id,
      recommendationId: updated.id,
      from: current.status,
      to: updated.status,
    });
    revalidatePath(`/projects/${project.id}`, "layout");
    return { id: updated.id, status: updated.status, previousStatus: current.status };
  }, "recommendations.set_status");
}
