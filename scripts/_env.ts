/**
 * Load environment variables for CLI scripts (.env.local first, then .env),
 * mirroring how Next.js loads them. Existing process env always wins.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) config({ path: full, quiet: true });
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`\n✖ ${name} is not set. Copy .env.example to .env.local and fill it in.\n`);
    process.exit(1);
  }
  return value;
}

export function describeDatabase(url: string) {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || 5432}${u.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}
