import "server-only";

import { after } from "next/server";

import { features } from "@/lib/env";
import { logger } from "@/lib/logger";
import { runScanToCompletion } from "@/services/scans/pipeline";

/**
 * Hand a scan to a background worker without blocking the request.
 *
 *  - Inngest configured  → send `scan/requested` (durable, retried, batched)
 *  - Otherwise (default) → run in-process after the response via `after()`;
 *    the cron worker (/api/cron/process-scans) resumes anything that stops
 *    early (deploys, function timeouts).
 */
export async function enqueueScan(scanId: string): Promise<"inngest" | "inline"> {
  if (features.inngest()) {
    try {
      const { inngest } = await import("./inngest");
      await inngest.send({ name: "scan/requested", data: { scanId } });
      logger.info("scan.enqueued", { scanId, driver: "inngest" });
      return "inngest";
    } catch (error) {
      logger.warn("scan.enqueue_inngest_failed", { scanId, error: (error as Error).message });
    }
  }
  after(async () => {
    await runScanToCompletion(scanId);
  });
  logger.info("scan.enqueued", { scanId, driver: "inline" });
  return "inline";
}
