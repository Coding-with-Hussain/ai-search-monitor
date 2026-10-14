import "server-only";

import { timingSafeEqual } from "node:crypto";

import { env, isProduction } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Authenticate scheduler requests (Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>`). Constant-time comparison; when
 * CRON_SECRET is unset the endpoints only work outside production.
 * Returns a Response to send back when the request is rejected, else null.
 */
export function verifyCronRequest(request: Request): Response | null {
  const secret = env().CRON_SECRET;
  if (!secret) {
    if (isProduction()) {
      logger.error("cron.not_configured");
      return Response.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
    }
    return null;
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    logger.warn("cron.unauthorized", { path: new URL(request.url).pathname });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
