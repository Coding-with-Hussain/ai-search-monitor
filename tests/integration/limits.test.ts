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
    await addCompetitor(userId, project, { name: "Third Rival", website: undefined });
    await expect(addCompetitor(userId, project, { name: "Fourth Rival", website: undefined })).rejects.toMatchObject({ code: "PLAN_LIMIT" });
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
