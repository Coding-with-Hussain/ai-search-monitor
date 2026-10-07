/**
 * Apply SQL migrations from supabase/migrations to DATABASE_URL.
 *
 * Tracks applied versions in `supabase_migrations.schema_migrations` — the
 * same table the Supabase CLI uses — so you can mix `npm run db:migrate` and
 * `supabase db push` safely. Each migration runs in its own transaction.
 *
 *   npm run db:migrate            apply pending migrations
 *   npm run db:migrate -- --dry   list pending migrations only
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import postgres from "postgres";

import { describeDatabase, requireEnv } from "./_env";

async function main() {
  const dry = process.argv.includes("--dry");
  const url = requireEnv("DATABASE_URL");
  const dir = path.resolve(process.cwd(), "supabase/migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  console.log(`Database: ${describeDatabase(url)}`);
  try {
    await sql`create schema if not exists supabase_migrations`;
    await sql`create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)`;
    const applied = new Set((await sql<{ version: string }[]>`select version from supabase_migrations.schema_migrations`).map((r) => r.version));

    const pending = files.filter((f) => !applied.has(f.split("_")[0]));
    if (pending.length === 0) {
      console.log("✓ Database is up to date.");
      return;
    }
    for (const file of pending) {
      const version = file.split("_")[0];
      const name = file.replace(/^\d+_/, "").replace(/\.sql$/, "");
      if (dry) {
        console.log(`• pending: ${file}`);
        continue;
      }
      const content = readFileSync(path.join(dir, file), "utf8");
      process.stdout.write(`→ applying ${file} … `);
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`insert into supabase_migrations.schema_migrations (version, name, statements) values (${version}, ${name}, ${[content]})`;
      });
      console.log("done");
    }
    if (!dry) console.log(`✓ Applied ${pending.length} migration(s).`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("✖ Migration failed:", error.message);
  process.exit(1);
});
