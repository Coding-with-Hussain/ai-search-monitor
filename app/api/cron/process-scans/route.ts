import { errorResponse } from "@/lib/action-utils";
import { verifyCronRequest } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import { processPendingScans } from "@/services/scheduler";

export const maxDuration = 60;

/** Resume queued or stalled scans (e.g. after a deploy or function timeout). */
export async function GET(request: Request) {
  const rejected = verifyCronRequest(request);
  if (rejected) return rejected;
  try {
    const processed = await processPendingScans(50_000);
    logger.info("cron.process_scans.done", { processed: processed.length });
    return Response.json({ processed: processed.length });
  } catch (error) {
    return errorResponse(error, "cron.process_scans");
  }
}
