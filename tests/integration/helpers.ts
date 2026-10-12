import { randomUUID } from "node:crypto";

import { eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { type AuthorizedProject, getProjectForUser } from "@/db/repositories/projects";
import { subscriptions } from "@/db/schema";
import { createProjectWithSetup } from "@/services/projects/service";

export const hasDatabase = Boolean(process.env.DATABASE_URL);

const created: string[] = [];

/** Insert an auth user; the on_auth_user_created trigger creates profile + trial subscription. */
export async function createTestUser(label = "user") {
  const id = randomUUID();
  const email = `it-${label}-${id.slice(0, 8)}@example.test`;
  await db().execute(sql`insert into auth.users (id, email, raw_user_meta_data) values (${id}, ${email}, ${JSON.stringify({ full_name: label })}::jsonb)`);
  created.push(id);
  return { id, email, fullName: label };
}

export async function setPlan(userId: string, plan: "starter" | "growth" | "pro" | "agency", status: "active" | "trialing" | "canceled" = "active", trialEndsAt: Date | null = null) {
  await db().update(subscriptions).set({ plan, status, trialEndsAt }).where(eq(subscriptions.userId, userId));
}

export async function createTestProject(userId: string, overrides: Partial<Parameters<typeof createProjectWithSetup>[1]> = {}, opts: { skipEntitlements?: boolean } = {}): Promise<AuthorizedProject> {
  const project = await createProjectWithSetup(
    userId,
    {
      name: "Test Dental Co",
      website: "https://testdental.example",
      industry: "Dental Clinic",
      businessType: "local",
      country: "Pakistan",
      city: "Lahore",
      description: undefined,
      services: ["Dental implants", "Braces"],
      competitors: [
        { name: "Rival Dental", website: "https://rivaldental.example" },
        { name: "Bright Smiles", website: undefined },
      ],
      monitoring: { generateQueries: true, frequency: "weekly", queryCount: 8, providers: ["chatgpt", "gemini", "perplexity"] },
      runFirstScan: false,
      ...overrides,
    },
    opts,
  );
  return getProjectForUser(userId, project.id);
}

export async function cleanupUsers() {
  if (created.length === 0) return;
  await db().execute(sql`delete from auth.users where id in ${sql.raw(`(${created.map((id) => `'${id}'`).join(",")})`)}`);
  created.length = 0;
}

export { inArray };
