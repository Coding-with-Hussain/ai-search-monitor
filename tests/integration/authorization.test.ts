import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getProjectForUser, listProjectsForUser } from "@/db/repositories/projects";
import { getQuery, listQueries } from "@/db/repositories/queries";
import { getScanForProject } from "@/db/repositories/scans";

import { cleanupUsers, createTestProject, createTestUser, hasDatabase } from "./helpers";

describe.skipIf(!hasDatabase)("user isolation (IDOR protection)", () => {
  let alice: string;
  let bob: string;
  let aliceProjectId: string;

  beforeAll(async () => {
    alice = (await createTestUser("alice")).id;
    bob = (await createTestUser("bob")).id;
    aliceProjectId = (await createTestProject(alice)).id;
    await createTestProject(bob, { name: "Bob Bakery", industry: "Bakery" });
  });

  afterAll(cleanupUsers);

  it("does not let another user load a project by id", async () => {
    await expect(getProjectForUser(bob, aliceProjectId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getProjectForUser(alice, aliceProjectId)).resolves.toMatchObject({ id: aliceProjectId });
  });

  it("treats malformed ids as not found (no SQL errors)", async () => {
    await expect(getProjectForUser(alice, "not-a-uuid'; drop table projects;--")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lists only the user's own projects", async () => {
    const bobs = await listProjectsForUser(bob);
    expect(bobs.map((p) => p.id)).not.toContain(aliceProjectId);
    expect(bobs).toHaveLength(1);
  });

  it("scopes child records to the authorized project", async () => {
    const aliceProject = await getProjectForUser(alice, aliceProjectId);
    const bobProject = (await listProjectsForUser(bob))[0] as Awaited<ReturnType<typeof getProjectForUser>>;
    const { rows } = await listQueries(aliceProject, {});
    expect(rows.length).toBeGreaterThan(0);
    // Bob cannot read Alice's question through his own project.
    expect(await getQuery(bobProject, rows[0].id)).toBeNull();
    await expect(getScanForProject(bobProject, "00000000-0000-0000-0000-000000000000")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
