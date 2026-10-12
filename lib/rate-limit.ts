import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { rateLimited } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Fixed-window rate limiter backed by Postgres (`rate_limits` table), so it
 * works across serverless instances. Falls back to an in-memory window if the
 * database is unreachable (fail-open would be unsafe for paid APIs, so the
 * memory window still applies limits per instance).
 */

const memory = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  count: number;
  limit: number;
  resetAt: Date;
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  try {
    const rows = await db().execute<{ count: number; reset_at: string }>(sql`
      insert into public.rate_limits (key, count, reset_at)
      values (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
      on conflict (key) do update set
        count = case when public.rate_limits.reset_at <= now() then 1 else public.rate_limits.count + 1 end,
        reset_at = case when public.rate_limits.reset_at <= now() then excluded.reset_at else public.rate_limits.reset_at end
      returning count, reset_at
    `);
    const row = rows[0];
    const count = Number(row.count);
    return { ok: count <= limit, count, limit, resetAt: new Date(row.reset_at) };
  } catch (error) {
    logger.warn("rate_limit.db_unavailable", { error: (error as Error).message });
    const now = Date.now();
    const cur = memory.get(key);
    const entry = !cur || cur.resetAt <= now ? { count: 1, resetAt: now + windowSeconds * 1000 } : { ...cur, count: cur.count + 1 };
    memory.set(key, entry);
    return { ok: entry.count <= limit, count: entry.count, limit, resetAt: new Date(entry.resetAt) };
  }
}

/** Throw a typed 429 AppError when the limit is exceeded. */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number, message?: string) {
  const result = await rateLimit(key, limit, windowSeconds);
  if (!result.ok) {
    const minutes = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 60_000));
    throw rateLimited(message ?? `You're doing that too often. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  }
  return result;
}

/** Central limits for expensive operations (per user unless noted). */
export const RATE_LIMITS = {
  startScan: { limit: 10, windowSeconds: 3600 },
  generateQueries: { limit: 20, windowSeconds: 3600 },
  generateReport: { limit: 30, windowSeconds: 3600 },
  createProject: { limit: 10, windowSeconds: 3600 },
  /** Per IP hash. */
  freeCheck: { limit: 3, windowSeconds: 86_400 },
  authAttempt: { limit: 10, windowSeconds: 600 },
} as const;
