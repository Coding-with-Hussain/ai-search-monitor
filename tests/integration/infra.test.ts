import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { projects, rateLimits, scans } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { enqueueDueScans, processPendingScans } from "@/services/scheduler";

import { cleanupUsers, createTestProject, createTestUser, hasDatabase } from "./helpers";

describe.skipIf(!hasDatabase)("rate limiter", () => {
  const key = `it:${randomUUID()}`;
  afterAll(async () => {
    await db().delete(rateLimits).where(eq(rateLimits.key, key));
  });

  it("allows up to the limit then blocks, and resets after the window", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit(key, 3, 60));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    await db().execute(sql`update public.rate_limits set reset_at = now() - interval '1 second' where key = ${key}`);
    expect((await rateLimit(key, 3, 60)).ok).toBe(true);
  });
});

describe.skipIf(!hasDatabase)("scheduler", () => {
  let projectId: string;
  beforeAll(async () => {
    const user = await createTestUser("scheduler");
    projectId = (await createTestProject(user.id)).id;
    await db().update(projects).set({ nextScanAt: new Date(Date.now() - 60_000) }).where(eq(projects.id, projectId));
  });
  afterAll(cleanupUsers);

  it("creates scans for due projects and processes them", async () => {
    const created = await enqueueDueScans();
    const ours = await db().select().from(scans).where(eq(scans.projectId, projectId));
    expect(ours).toHaveLength(1);
    expect(created).toContain(ours[0].id);
    expect(ours[0].trigger).toBe("scheduled");

    await processPendingScans(30_000);
    const [done] = await db().select().from(scans).where(eq(scans.id, ours[0].id));
    expect(done.status).toBe("completed");
    const [p] = await db().select().from(projects).where(eq(projects.id, projectId));
    expect(p.nextScanAt!.getTime()).toBeGreaterThan(Date.now());
  });
});
