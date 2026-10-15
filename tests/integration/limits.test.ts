import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { getProjectForUser } from "@/db/repositories/projects";
import { usageRecords } from "@/db/schema";
import { getUsageSummary } from "@/lib/billing/entitlements";
import { addCompetitor } from "@/services/projects/service";
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
