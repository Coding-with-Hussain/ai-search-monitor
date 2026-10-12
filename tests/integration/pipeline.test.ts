import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { getProjectForUser } from "@/db/repositories/projects";
import { aiAnalysis, aiRuns, notifications, projects, recommendations, scans, sources, usageRecords } from "@/db/schema";
import { createScan, recalculateScan, runScanToCompletion } from "@/services/scans/pipeline";

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
