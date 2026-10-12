import "server-only";

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { DatabaseNotConfiguredError } from "@/db";
import { type ActionResult, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Run server-action logic and convert failures into a serializable
 * `ActionResult`. Typed AppErrors keep their user-facing message; anything
 * unexpected is logged and replaced with a generic message (no internals or
 * secrets reach the browser). Next.js control-flow errors (redirect,
 * notFound) are re-thrown.
 */
export async function runAction<T>(fn: () => Promise<T>, name = "action"): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const key = issue.path.join(".") || "_";
        (fieldErrors[key] ??= []).push(issue.message);
      }
      return {
        ok: false,
        error: error.issues[0]?.message ?? "Please check the highlighted fields.",
        code: "VALIDATION",
        fieldErrors,
      };
    }
    if (isAppError(error)) {
      return { ok: false, error: error.message, code: error.code, details: error.details };
    }
    if (error instanceof DatabaseNotConfiguredError) {
      return { ok: false, error: error.message, code: "NOT_CONFIGURED" };
    }
    logger.error(`${name}.failed`, { error: (error as Error)?.message });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

/** Map an error to an HTTP JSON response for route handlers. */
export function errorResponse(error: unknown, name = "route") {
  if (isAppError(error)) {
    return Response.json({ error: error.message, code: error.code, details: error.details }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return Response.json({ error: error.issues[0]?.message ?? "Invalid request.", code: "VALIDATION" }, { status: 400 });
  }
  if (error instanceof DatabaseNotConfiguredError) {
    return Response.json({ error: error.message, code: "NOT_CONFIGURED" }, { status: 503 });
  }
  logger.error(`${name}.failed`, { error: (error as Error)?.message });
  return Response.json({ error: "Internal error. Please try again." }, { status: 500 });
}
