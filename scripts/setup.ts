/**
 * One-command local setup:
 *
 *   npm run setup              validate env + apply migrations
 *   npm run setup -- --seed    …and seed the demo account/project
 *
 * Safe by default: refuses to touch a non-local database unless --remote is
 * passed, and never deletes data (seeding is idempotent).
 */
import { execFileSync } from "node:child_process";

import { describeDatabase } from "./_env";

type Check = { name: string; ok: boolean; required: boolean; hint: string };

function has(name: string) {
  return Boolean(process.env[name]?.trim());
}

function run(script: string, args: string[] = []) {
  execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", script, ...args], { stdio: "inherit" });
}

async function main() {
  const checks: Check[] = [
    { name: "DATABASE_URL", ok: has("DATABASE_URL"), required: true, hint: "Supabase → Connect → connection string (use the pooler URL in production)" },
    { name: "NEXT_PUBLIC_SUPABASE_URL", ok: has("NEXT_PUBLIC_SUPABASE_URL"), required: true, hint: "Supabase → Project Settings → API" },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: has("NEXT_PUBLIC_SUPABASE_ANON_KEY") || has("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), required: true, hint: "Supabase → Project Settings → API" },
    { name: "SUPABASE_SERVICE_ROLE_KEY", ok: has("SUPABASE_SERVICE_ROLE_KEY"), required: false, hint: "needed for account deletion and `npm run seed`" },
    { name: "CRON_SECRET", ok: has("CRON_SECRET"), required: false, hint: "required in production for /api/cron/* (e.g. `openssl rand -hex 32`)" },
    { name: "STRIPE_SECRET_KEY", ok: has("STRIPE_SECRET_KEY"), required: false, hint: "billing checkout is disabled without it" },
    { name: "STRIPE_WEBHOOK_SECRET", ok: has("STRIPE_WEBHOOK_SECRET"), required: false, hint: "subscription sync needs the webhook" },
    { name: "OPENAI_API_KEY", ok: has("OPENAI_API_KEY"), required: false, hint: "live ChatGPT monitoring + AI-assisted analysis" },
    { name: "GOOGLE_AI_API_KEY", ok: has("GOOGLE_AI_API_KEY"), required: false, hint: "live Gemini monitoring" },
    { name: "PERPLEXITY_API_KEY", ok: has("PERPLEXITY_API_KEY"), required: false, hint: "live Perplexity monitoring" },
    { name: "RESEND_API_KEY", ok: has("RESEND_API_KEY"), required: false, hint: "weekly report and alert emails" },
  ];

  console.log("\nAI Search Visibility Monitor — setup\n");
  for (const c of checks) {
    const mark = c.ok ? "✓" : c.required ? "✖" : "•";
    console.log(`  ${mark} ${c.name.padEnd(32)} ${c.ok ? "set" : c.required ? `missing — ${c.hint}` : `optional — ${c.hint}`}`);
  }
  const mock = (process.env.AI_VISIBILITY_MOCK_MODE ?? "true").toLowerCase() !== "false";
  console.log(`\n  Mode: ${mock ? "SIMULATION (AI_VISIBILITY_MOCK_MODE=true — no AI API calls)" : "LIVE (real AI provider calls, costs apply)"}`);

  if (checks.some((c) => c.required && !c.ok)) {
    console.error("\n✖ Required variables are missing. Copy .env.example to .env.local and fill them in.\n");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL as string;
  const host = new URL(url).hostname;
  const isLocal = ["localhost", "127.0.0.1", "::1", "db", "postgres"].includes(host);
  console.log(`\n  Database: ${describeDatabase(url)}${isLocal ? " (local)" : ""}`);
  if (!isLocal && !process.argv.includes("--remote")) {
    console.error("\n✖ DATABASE_URL points to a remote database. Re-run with --remote to apply migrations there.\n");
    process.exit(1);
  }

  console.log("\n→ Applying migrations");
  run("scripts/migrate.ts");

  if (process.argv.includes("--seed")) {
    console.log("\n→ Seeding demo data");
    run("scripts/seed.ts");
  } else {
    console.log("\n  Tip: run `npm run seed` to create a demo account with sample (simulated) data.");
  }
  console.log("\n✓ Setup complete. Start the app with `npm run dev`.\n");
}

import("./_env").then(main).catch((error) => {
  console.error("✖ Setup failed:", error.message);
  process.exit(1);
});
