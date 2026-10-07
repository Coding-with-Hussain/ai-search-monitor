/**
 * Typed application errors. Server actions convert these into user-facing
 * results; route handlers map them to HTTP status codes. Messages are written
 * for end users — never put secrets or internals in them.
 */

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "USAGE_LIMIT"
  | "PLAN_LIMIT"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "NOT_CONFIGURED"
  | "SUBSCRIPTION_INACTIVE";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: AppErrorCode, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const unauthorized = (message = "Please sign in to continue.") => new AppError("UNAUTHORIZED", message, 401);
export const forbidden = (message = "You don't have access to this resource.") => new AppError("FORBIDDEN", message, 403);
export const notFound = (message = "We couldn't find what you were looking for.") => new AppError("NOT_FOUND", message, 404);
export const validationError = (message: string, details?: Record<string, unknown>) =>
  new AppError("VALIDATION", message, 400, details);
export const conflict = (message: string) => new AppError("CONFLICT", message, 409);
export const rateLimited = (message = "You're doing that too often. Please wait a moment and try again.") =>
  new AppError("RATE_LIMITED", message, 429);
export const notConfigured = (message: string) => new AppError("NOT_CONFIGURED", message, 503);

/** Hitting a plan allowance (projects, competitors, monthly queries…). */
export function planLimitError(
  message: string,
  details: { limit: string; used: number; max: number; plan: string },
) {
  return new AppError("PLAN_LIMIT", message, 402, details);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Result type returned by server actions so the client never sees raw errors. */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; code?: AppErrorCode; details?: Record<string, unknown>; fieldErrors?: Record<string, string[]> };
