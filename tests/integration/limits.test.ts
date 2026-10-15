import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { getProjectForUser } from "@/db/repositories/projects";
import { notifications, projects, usageRecords } from "@/db/schema";
import { getUsageSummary } from "@/lib/billing/entitlements";
import { addCompetitor } from "@/services/projects/service";
import { enqueueDueScans } from "@/services/scheduler";
import { createScan, runScanToCompletion } from "@/services/scans/pipeline";

import { cleanupUsers, createTestProject, createTestUser, hasDatabase, setPlan } from "./helpers";

describe.skipIf(!hasDatabase)("plan enforcement (server-side)", () => {
  let userId: string;
  let projectId: string;

  beforeAll(async () => {
    userId = (await createTestUser("limits")).id; // starts on a Starter trial
    projectId = (await createTestProject(userId)).id;
  });

  afterAll(cleanupUsers);

  it("new users get an active Starter trial", async () => {
    const usage = await getUsageSummary(userId);
    expect(usage.projectsUsed).toBe(1);
    expect(usage.projectsLimit).toBe(1);
    expect(usage.queriesLimit).toBe(50);
  });

  it("blocks creating more projects than the plan allows", async () => {
    await expect(createTestProject(userId, { name: "Second Biz" })).rejects.toMatchObject({ code: "PLAN_LIMIT" });
  });

  it("blocks adding competitors beyond the plan limit", async () => {
    const project = await getProjectForUser(userId, projectId);
    await addCompetitor(project, { name: "Third Rival", website: undefined });
    await expect(addCompetitor(project, { name: "Fourth Rival", website: undefined })).rejects.toMatchObject({ code: "PLAN_LIMIT" });
  });

  it("rejects daily monitoring on Starter", async () => {
    await setPlan(userId, "growth");
    await expect(
      createTestProject(userId, { name: "Daily Biz", monitoring: { generateQueries: false, frequency: "daily", queryCount: 5, providers: ["chatgpt"] } }),
    ).rejects.toMatchObject({ code: "PLAN_LIMIT" });
    await setPlan(userId, "starter", "trialing", new Date(Date.now() + 86_400_000));
  });

  it("truncates a scan to the remaining monthly queries, highest priority first", async () => {
    const project = await getProjectForUser(userId, projectId);
    await db().insert(usageRecords).values({ userId, kind: "query_run", quantity: 45 });
    const scan = await createScan({ project, userId, trigger: "manual" });
    expect(scan.queryCount).toBe(5);
    expect(scan.notes.join(" ")).toMatch(/remaining monthly queries/);
    await runScanToCompletion(scan.id);
  });

  it("blocks scans once the monthly quota is used", async () => {
    const project = await getProjectForUser(userId, projectId);
    await expect(createScan({ project, userId, trigger: "manual" })).rejects.toMatchObject({ code: "PLAN_LIMIT" });
  });

  it("blocks scans when the trial has ended", async () => {
    await db().execute(sql`delete from public.usage_records where user_id = ${userId}`);
    await setPlan(userId, "starter", "trialing", new Date(Date.now() - 86_400_000));
    const project = await getProjectForUser(userId, projectId);
    await expect(createScan({ project, userId, trigger: "manual" })).rejects.toMatchObject({ code: "SUBSCRIPTION_INACTIVE" });
  });
});

describe.skipIf(!hasDatabase)("plan enforcement under concurrency", () => {
  afterAll(cleanupUsers);

  it("parallel project creation cannot exceed the project limit", async () => {
    const userId = (await createTestUser("race-projects")).id; // Starter trial: 1 project
    const results = await Promise.allSettled([1, 2, 3].map((i) => createTestProject(userId, { name: `Race Biz ${i}` })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results) if (r.status === "rejected") expect(r.reason).toMatchObject({ code: "PLAN_LIMIT" });
    expect((await getUsageSummary(userId)).projectsUsed).toBe(1);
  });

  it("parallel scans cannot start twice for a project or overspend the quota", async () => {
    const userId = (await createTestUser("race-scans")).id;
    const project = await createTestProject(userId, {
      monitoring: { generateQueries: true, frequency: "weekly", queryCount: 30, providers: ["chatgpt"] },
    });
    const results = await Promise.allSettled([1, 2, 3].map(() => createScan({ project, userId, trigger: "manual" })));
    const created = results.filter((r) => r.status === "fulfilled");
    expect(created).toHaveLength(1);
    for (const r of results) if (r.status === "rejected") expect(r.reason).toMatchObject({ code: "CONFLICT" });
    const usage = await getUsageSummary(userId);
    expect(usage.queriesUsed).toBeLessThanOrEqual(usage.queriesLimit);
    await runScanToCompletion((created[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof createScan>>>).value.id);
  });

  it("the database rejects a second active scan for the same project", async () => {
    const userId = (await createTestUser("race-index")).id;
    const project = await createTestProject(userId);
    const insertActive = () =>
      db().execute(sql`insert into public.scans (project_id, user_id, status) values (${project.id}, ${userId}, 'queued')`);
    await insertActive();
    await expect(insertActive()).rejects.toThrow();
  });
});

describe.skipIf(!hasDatabase)("plan downgrades", () => {
  afterAll(cleanupUsers);

  it("moves daily monitoring to weekly and stops scanning projects beyond the plan", async () => {
    const userId = (await createTestUser("downgrade")).id;
    await setPlan(userId, "pro");
    const daily = await createTestProject(userId, {
      name: "Daily Biz",
      monitoring: { generateQueries: true, frequency: "daily", queryCount: 5, providers: ["chatgpt"] },
    });
    const second = await createTestProject(userId, { name: "Second Biz" });
    await setPlan(userId, "starter");

    // Scheduler: the daily schedule is no longer included, so it becomes weekly.
    await db().update(projects).set({ nextScanAt: new Date("2000-01-01T00:00:00Z") }).where(eq(projects.id, daily.id));
    expect(await enqueueDueScans(1)).toEqual([]);
    const [after] = await db().select().from(projects).where(eq(projects.id, daily.id));
    expect(after.monitoringFrequency).toBe("weekly");
    expect(after.nextScanAt!.getTime()).toBeGreaterThan(Date.now());
    const notes = await db().select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.type, "monitoring_schedule_changed")));
    expect(notes).toHaveLength(1);

    // Only the oldest project fits the Starter plan.
    await expect(createScan({ project: second, userId, trigger: "manual" })).rejects.toMatchObject({ code: "PLAN_LIMIT" });
    const ok = await createScan({ project: await getProjectForUser(userId, daily.id), userId, trigger: "manual" });
    await runScanToCompletion(ok.id);
  });
});

