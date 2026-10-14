import { errorResponse } from "@/lib/action-utils";
import { verifyCronRequest } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import { enqueueDueScans, processPendingScans } from "@/services/scheduler";

export const maxDuration = 60;

/** Create scans for projects whose next_scan_at is due, then start processing them. */
export async function GET(request: Request) {
  const rejected = verifyCronRequest(request);
  if (rejected) return rejected;
  const started = Date.now();
  try {
    logger.info("cron.scheduled_scans.start");
    const created = await enqueueDueScans();
    const processed = await processPendingScans(Math.max(5_000, 50_000 - (Date.now() - started)));
    logger.info("cron.scheduled_scans.done", { created: created.length, processed: processed.length, ms: Date.now() - started });
    return Response.json({ created: created.length, processed: processed.length });
  } catch (error) {
    return errorResponse(error, "cron.scheduled_scans");
  }
}
