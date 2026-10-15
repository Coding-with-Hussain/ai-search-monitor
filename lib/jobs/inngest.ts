import { Inngest } from "inngest";

import { enqueueDueScans, processPendingScans, sendWeeklyReports } from "@/services/scheduler";
import { processScan } from "@/services/scans/pipeline";

/**
 * Optional Inngest integration (durable background jobs). Enabled when
 * INNGEST_EVENT_KEY is set (or INNGEST_DEV=true with the Inngest dev server).
 * Without it, scans run in-process via `after()` and the cron routes resume
 * any unfinished work — see lib/jobs/runner.ts.
 */
export const inngest = new Inngest({ id: "ai-search-visibility-monitor" });

export const processScanFunction = inngest.createFunction(
  { id: "process-scan", triggers: [{ event: "scan/requested" }], retries: 2 },
  async ({ event, step }) => {
    const scanId = String((event.data as { scanId?: string }).scanId ?? "");
    if (!scanId) return { skipped: true };
    // Each step processes a bounded batch so long scans survive function time limits.
    for (let i = 0; i < 300; i++) {
      const { done } = await step.run(`batch-${i}`, () => processScan(scanId, { deadlineMs: 45_000 }));
      if (done) return { scanId, batches: i + 1 };
    }
    return { scanId, incomplete: true };
  },
);

export const scheduledScansFunction = inngest.createFunction(
  { id: "scheduled-scans", triggers: [{ cron: "*/15 * * * *" }] },
  async ({ step }) => {
    const created = await step.run("enqueue-due-scans", () => enqueueDueScans());
    for (const scanId of created) {
      await step.sendEvent(`scan-${scanId}`, { name: "scan/requested", data: { scanId } });
    }
    await step.run("resume-stalled", () => processPendingScans(40_000));
    return { created: created.length };
  },
);

export const weeklyReportsFunction = inngest.createFunction(
  { id: "weekly-reports", triggers: [{ cron: "0 8 * * *" }] },
  async ({ step }) => step.run("send-weekly-reports", () => sendWeeklyReports()),
);

export const inngestFunctions = [processScanFunction, scheduledScansFunction, weeklyReportsFunction];
