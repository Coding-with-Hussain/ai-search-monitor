import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";

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

describe.skipIf(!hasDatabase)("Supabase Data API roles (RLS)", () => {
  let ownerId: string;
  let otherId: string;
  let projectId: string;

  beforeAll(async () => {
    ownerId = (await createTestUser("rls-owner")).id;
    otherId = (await createTestUser("rls-other")).id;
    projectId = (await createTestProject(ownerId)).id;
  });

  afterAll(cleanupUsers);

  /** Run a statement as the `authenticated` role with the given user's JWT subject. */
  const asUser = (userId: string, statement: ReturnType<typeof sql>) =>
    db().transaction(async (tx) => {
      await tx.execute(sql`select set_config('request.jwt.claim.sub', ${userId}, true)`);
      await tx.execute(sql`set local role authenticated`);
      return tx.execute(statement);
    });

  /** Drizzle wraps driver errors; the Postgres message is on `cause`. */
  const expectDenied = async (promise: Promise<unknown>) => {
    const error = await promise.then(
      () => null,
      (e: Error & { cause?: Error }) => e,
    );
    expect(error?.cause?.message ?? error?.message).toMatch(/permission denied/);
  };

  it("lets users read only their own rows", async () => {
    const own = await asUser(ownerId, sql`select id from public.projects`);
    expect(own.map((r) => r.id)).toEqual([projectId]);
    const other = await asUser(otherId, sql`select id from public.projects where id = ${projectId}`);
    expect(other).toHaveLength(0);
  });

  it("does not let users grant themselves admin", async () => {
    await expectDenied(asUser(ownerId, sql`update public.profiles set is_admin = true where id = ${ownerId}`));
  });

  it("does not let users bypass server-side limits by writing directly", async () => {
    await expectDenied(asUser(ownerId, sql`insert into public.projects (user_id, name, industry) values (${ownerId}, 'Direct Insert', 'Dental Clinic')`));
    await expectDenied(asUser(ownerId, sql`insert into public.competitors (project_id, name) values (${projectId}, 'Direct Rival')`));
    await expectDenied(asUser(ownerId, sql`update public.projects set user_id = ${otherId} where id = ${projectId}`));
  });
});

