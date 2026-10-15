import { and, eq, isNotNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { getProjectForUser } from "@/db/repositories/projects";
import { aiAnalysis, aiRuns, notifications, projects, queries, recommendations, scans, sources, usageRecords } from "@/db/schema";
import { createScan, findScansNeedingWork, processScan, recalculateScan, runScanToCompletion } from "@/services/scans/pipeline";

import { cleanupUsers, createTestProject, createTestUser, hasDatabase } from "./helpers";

describe.skipIf(!hasDatabase)("scan pipeline (integration)", () => {
  let userId: string;
  let projectId: string;

  beforeAll(async () => {
    const user = await createTestUser("pipeline");
    userId = user.id;
    const project = await createTestProject(userId);
    projectId = project.id;
  });

  afterAll(cleanupUsers);

  it("creates project, competitors and generated questions", async () => {
    const project = await getProjectForUser(userId, projectId);
    expect(project.domain).toBe("testdental.example");
    expect(project.services).toEqual(["Dental implants", "Braces"]);
  });

  it("runs a complete simulated scan end-to-end", async () => {
    const project = await getProjectForUser(userId, projectId);
    const scan = await createScan({ project, userId, trigger: "manual" });
    expect(scan.status).toBe("queued");
    expect(scan.mode).toBe("mock");
    expect(scan.totalItems).toBe(8 * 3);

    await runScanToCompletion(scan.id);

    const [done] = await db().select().from(scans).where(eq(scans.id, scan.id));
    expect(done.status).toBe("completed");
    expect(done.completedItems).toBe(24);
    expect(done.failedItems).toBe(0);
    expect(done.score).toBeGreaterThanOrEqual(0);
    expect(done.score).toBeLessThanOrEqual(100);
    expect(done.metrics?.providers).toHaveLength(3);
    expect(done.metrics?.competitors.map((c) => c.name).sort()).toEqual(["Bright Smiles", "Rival Dental"]);

    const runs = await db().select().from(aiRuns).where(eq(aiRuns.scanId, scan.id));
    expect(runs.every((r) => r.status === "completed" && r.isMock && r.responseText)).toBe(true);
    const analyses = await db().select().from(aiAnalysis).where(eq(aiAnalysis.scanId, scan.id));
    expect(analyses).toHaveLength(24);
    for (const a of analyses) {
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(100);
      if (!a.mentioned) expect(a.score).toBe(0);
    }
    expect((await db().select().from(sources).where(eq(sources.scanId, scan.id))).length).toBeGreaterThan(0);
    expect((await db().select().from(recommendations).where(eq(recommendations.projectId, projectId))).length).toBeGreaterThan(0);

    const [p] = await db().select().from(projects).where(eq(projects.id, projectId));
    expect(p.latestScanId).toBe(scan.id);
    expect(p.latestScore).toBe(done.score);
    expect(p.nextScanAt!.getTime() - p.lastScanAt!.getTime()).toBe(7 * 86_400_000);

    const usage = await db().select().from(usageRecords).where(eq(usageRecords.scanId, scan.id));
    expect(usage.find((u) => u.kind === "query_run")?.quantity).toBe(8);
    expect(usage.filter((u) => u.kind === "provider_call")).toHaveLength(3);

    const notes = await db().select().from(notifications).where(and(eq(notifications.projectId, projectId), eq(notifications.type, "scan_completed")));
    expect(notes).toHaveLength(1);
  });

  it("tracks previous score across scans and recalculates without provider calls", async () => {
    const project = await getProjectForUser(userId, projectId);
    const first = project.latestScore;
    const scan = await createScan({ project, userId, trigger: "manual" });
    await runScanToCompletion(scan.id);
    const [p] = await db().select().from(projects).where(eq(projects.id, projectId));
    expect(p.previousScore).toBe(first);
    const [done] = await db().select().from(scans).where(eq(scans.id, scan.id));
    const metrics = await recalculateScan(scan.id);
    expect(metrics.overall.score).toBe(done.score);
  });

  it("refuses a second scan while one is active", async () => {
    const project = await getProjectForUser(userId, projectId);
    const scan = await createScan({ project, userId, trigger: "manual" });
    await expect(createScan({ project, userId, trigger: "manual" })).rejects.toMatchObject({ code: "CONFLICT" });
    await runScanToCompletion(scan.id);
  });
});

describe.skipIf(!hasDatabase)("failed scheduled scans", () => {
  afterAll(cleanupUsers);

  it("are not charged, move the schedule forward and notify the owner", async () => {
    const owner = (await createTestUser("sched-fail")).id;
    const created = await createTestProject(owner);
    await db().update(projects).set({ nextScanAt: new Date(Date.now() - 60_000) }).where(eq(projects.id, created.id));
    const project = await getProjectForUser(owner, created.id);

    // Live mode with no provider keys: every check is unavailable, so the scan fails.
    const scan = await createScan({ project, userId: owner, trigger: "scheduled", mode: "live" });
    await runScanToCompletion(scan.id);

    const [row] = await db().select().from(scans).where(eq(scans.id, scan.id));
    expect(row.status).toBe("failed");
    const usage = await db().select().from(usageRecords).where(and(eq(usageRecords.scanId, scan.id), eq(usageRecords.kind, "query_run")));
    expect(usage.reduce((sum, u) => sum + u.quantity, 0)).toBe(0);
    const [after] = await db().select().from(projects).where(eq(projects.id, project.id));
    expect(after.nextScanAt!.getTime()).toBeGreaterThan(Date.now());
    const notes = await db().select().from(notifications).where(and(eq(notifications.userId, owner), eq(notifications.type, "scan_failed")));
    expect(notes).toHaveLength(1);
  });
});

describe.skipIf(!hasDatabase)("scan recovery", () => {
  afterAll(cleanupUsers);

  it("reuses a stored answer instead of calling the provider again", async () => {
    const owner = (await createTestUser("reuse")).id;
    const project = await createTestProject(owner, {
      monitoring: { generateQueries: true, frequency: "weekly", queryCount: 5, providers: ["chatgpt"] },
    });
    const scan = await createScan({ project, userId: owner, trigger: "manual" });
    const [run] = await db().select().from(aiRuns).where(eq(aiRuns.scanId, scan.id)).limit(1);
    // As if an earlier attempt stored the answer and then failed during analysis.
    const stored = "1. **Test Dental Co** – Reused stored answer, highly rated.";
    await db().update(aiRuns).set({ responseText: stored, citations: [], status: "pending", attempts: 1 }).where(eq(aiRuns.id, run.id));

    await runScanToCompletion(scan.id);

    const [after] = await db().select().from(aiRuns).where(eq(aiRuns.id, run.id));
    expect(after.responseText).toBe(stored);
    const [analysis] = await db().select().from(aiAnalysis).where(eq(aiAnalysis.aiRunId, run.id));
    expect(analysis).toMatchObject({ mentioned: true, position: 1 });
  });

  it("keeps scanning when questions are deleted mid-scan", async () => {
    const owner = (await createTestUser("delete-mid")).id;
    const project = await createTestProject(owner, {
      monitoring: { generateQueries: true, frequency: "weekly", queryCount: 6, providers: ["chatgpt", "gemini"] },
    });
    const scan = await createScan({ project, userId: owner, trigger: "manual" });
    const [victim] = await db().select().from(aiRuns).where(and(eq(aiRuns.scanId, scan.id), isNotNull(aiRuns.queryId))).limit(1);
    await db().delete(queries).where(eq(queries.id, victim.queryId!));

    await runScanToCompletion(scan.id);
    const [done] = await db().select().from(scans).where(eq(scans.id, scan.id));
    expect(done).toMatchObject({ status: "completed", failedItems: 0 });
  });

  it("recovers a scan whose finalizing worker died", async () => {
    const owner = (await createTestUser("stuck")).id;
    const project = await createTestProject(owner, {
      monitoring: { generateQueries: true, frequency: "weekly", queryCount: 5, providers: ["chatgpt"] },
    });
    const scan = await createScan({ project, userId: owner, trigger: "manual" });
    await processScan(scan.id);
    // Simulate a worker that claimed finalization and crashed before finishing.
    const stuck = { status: "running" as const, completedAt: null, heartbeatAt: new Date(Date.now() - 10 * 60_000) };
    await db().update(scans).set({ ...stuck, finalizingAt: new Date(Date.now() - 60_000) }).where(eq(scans.id, scan.id));
    expect((await findScansNeedingWork(1000)).map((s) => s.id)).not.toContain(scan.id);

    await db().update(scans).set({ ...stuck, finalizingAt: new Date(Date.now() - 10 * 60_000) }).where(eq(scans.id, scan.id));
    expect((await findScansNeedingWork(1000)).map((s) => s.id)).toContain(scan.id);
    await processScan(scan.id);
    const [row] = await db().select().from(scans).where(eq(scans.id, scan.id));
    expect(row.status).toBe("completed");
  });
});

