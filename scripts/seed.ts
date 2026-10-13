/**
 * Seed a clearly-labelled DEMO account and project.
 *
 *   npm run seed                 create demo user + "ABC Dental" demo project (idempotent)
 *   npm run seed -- --reset      delete and recreate the demo project
 *   npm run seed -- --user <id>  attach the demo project to an existing user id
 *
 * Everything created here is simulation data: the project is flagged
 * `is_demo`, every scan runs with mode = 'mock' (deterministic simulated AI
 * answers), and the UI labels it "Demo data". The real pipeline (analysis,
 * scoring, competitor metrics, recommendations) processes those answers.
 *
 * Safety: refuses to run when NODE_ENV=production unless --allow-production
 * is passed, and never touches projects other than the demo project.
 */
process.env.MOCK_LATENCY_MS = "0";

import { and, eq } from "drizzle-orm";

import { describeDatabase, requireEnv } from "./_env";

const DEMO = {
  email: process.env.SEED_DEMO_EMAIL ?? "demo@aivisibility.dev",
  password: process.env.SEED_DEMO_PASSWORD ?? "demo-password-123",
  name: "Demo User",
};

const HISTORY_WEEKS = 10;

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function ensureDemoUser(): Promise<string> {
  const explicit = arg("--user");
  if (explicit) return explicit;

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("✖ SUPABASE_SERVICE_ROLE_KEY is required to create the demo user (or pass --user <existing-user-id>).");
    process.exit(1);
  }
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const created = await admin.auth.admin.createUser({
    email: DEMO.email,
    password: DEMO.password,
    email_confirm: true,
    user_metadata: { full_name: DEMO.name },
  });
  if (created.data.user) return created.data.user.id;

  // Already exists — find it.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === DEMO.email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`Could not create or find demo user: ${created.error?.message ?? "unknown error"}`);
}

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--allow-production")) {
    console.error("✖ Refusing to seed with NODE_ENV=production. Pass --allow-production if you really mean it.");
    process.exit(1);
  }
  const dbUrl = requireEnv("DATABASE_URL");
  console.log(`Seeding demo data into ${describeDatabase(dbUrl)}`);

  const { db } = await import("@/db");
  const { projects, scans, subscriptions, usageRecords } = await import("@/db/schema");
  const { ensureUserRecords, updateProfile } = await import("@/db/repositories/profiles");
  const { createProjectWithSetup } = await import("@/services/projects/service");
  const { createScan, runScanToCompletion } = await import("@/services/scans/pipeline");

  const userId = await ensureDemoUser();
  await ensureUserRecords({ id: userId, email: DEMO.email, fullName: DEMO.name });

  // Demo account gets an active Growth plan so all core features are visible.
  await db()
    .update(subscriptions)
    .set({ plan: "growth", status: "active", trialEndsAt: null })
    .where(eq(subscriptions.userId, userId));

  const existing = await db()
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.isDemo, true), eq(projects.name, "ABC Dental")));
  if (existing.length) {
    if (!process.argv.includes("--reset")) {
      console.log("✓ Demo project already exists (use --reset to recreate).");
      console.log(`\nSign in with ${DEMO.email} / ${DEMO.password}`);
      process.exit(0);
    }
    for (const p of existing) {
      await db().delete(usageRecords).where(eq(usageRecords.projectId, p.id));
      await db().delete(projects).where(eq(projects.id, p.id));
    }
    console.log("• Removed previous demo project");
  }

  const project = await createProjectWithSetup(
    userId,
    {
      name: "ABC Dental",
      website: "https://abcdental.com",
      industry: "Dental Clinic",
      businessType: "local",
      country: "Pakistan",
      city: "Lahore",
      description: "Family and cosmetic dental clinic in Lahore.",
      services: ["Dental implants", "Braces", "Teeth whitening", "Root canal", "Dental checkups"],
      competitors: [
        { name: "XYZ Dental", website: "https://xyzdental.com" },
        { name: "Smile Clinic", website: "https://smileclinic.pk" },
        { name: "Dental Care Lahore", website: "https://dentalcarelahore.com" },
      ],
      monitoring: { generateQueries: true, frequency: "weekly", queryCount: 40, providers: ["chatgpt", "gemini", "perplexity"] },
      runFirstScan: false,
    },
    { isDemo: true, skipEntitlements: true },
  );
  console.log(`• Created demo project ${project.name} (${project.id})`);

  // Weekly history with gradually improving visibility (simulation strength).
  const now = Date.now();
  for (let i = HISTORY_WEEKS - 1; i >= 0; i--) {
    const progress = (HISTORY_WEEKS - 1 - i) / (HISTORY_WEEKS - 1);
    const strength = 0.4 + progress * 0.24 + (i % 3 === 0 ? -0.02 : 0.01);
    const createdAt = new Date(now - i * 7 * 86_400_000 - 3_600_000);
    const fresh = (await db().select().from(projects).where(eq(projects.id, project.id)))[0] as typeof project;
    const scan = await createScan({
      project: fresh,
      userId,
      trigger: "seed",
      mode: "mock",
      mockStrength: Math.round(strength * 100) / 100,
      skipEntitlements: true,
      createdAt,
    });
    await runScanToCompletion(scan.id);
    const [done] = await db().select().from(scans).where(eq(scans.id, scan.id));
    console.log(`• Scan ${createdAt.toISOString().slice(0, 10)} → score ${done.score} (${done.status})`);
  }

  await updateProfile(userId, { onboardingCompletedAt: new Date() });
  console.log(`\n✓ Demo data ready. Sign in with ${DEMO.email} / ${DEMO.password}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("✖ Seed failed:", error);
  process.exit(1);
});
