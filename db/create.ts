import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Create a postgres.js connection + Drizzle instance.
 *
 * `prepare: false` keeps us compatible with Supabase's transaction-mode
 * connection pooler (Supavisor), which does not support prepared statements.
 * This module has no `server-only` guard so CLI scripts (seed, migrate) and
 * tests can use it too.
 */
export function createDb(url: string, options: { max?: number } = {}) {
  const sql = postgres(url, {
    prepare: false,
    max: options.max ?? Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  });
  const db = drizzle(sql, { schema, casing: undefined });
  return { sql, db };
}
