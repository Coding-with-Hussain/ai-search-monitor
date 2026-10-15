import { errorResponse } from "@/lib/action-utils";
import { verifyCronRequest } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import { sendWeeklyReports } from "@/services/scheduler";

export const maxDuration = 60;

/** "Your AI visibility report is ready" emails: runs daily, each project gets at most one per week. */
export async function GET(request: Request) {
  const rejected = verifyCronRequest(request);
  if (rejected) return rejected;
  try {
    const sent = await sendWeeklyReports();
    logger.info("cron.weekly_reports.done", { sent });
    return Response.json({ sent });
  } catch (error) {
    return errorResponse(error, "cron.weekly_reports");
  }
}
