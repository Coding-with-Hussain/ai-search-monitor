import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import { createDb } from "./create";

export type Database = PostgresJsDatabase<typeof schema>;
/** The client or an open transaction — for helpers that must run inside a caller's transaction. */
export type DbExecutor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as {
  __aivmSql?: postgres.Sql;
  __aivmDb?: Database;
};

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "DATABASE_URL is not set. Add your Supabase Postgres connection string to .env.local (see .env.example).",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

/**
 * Lazily-created Drizzle client. Reused across hot reloads in development so
 * we don't exhaust connections.
 */
export function db(): Database {
  if (globalForDb.__aivmDb) return globalForDb.__aivmDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseNotConfiguredError();
  const { sql, db: instance } = createDb(url);
  globalForDb.__aivmSql = sql;
  globalForDb.__aivmDb = instance;
  return instance;
}

export { schema, drizzle };
