"use client";

import { unstable_rethrow } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import type { ActionResult } from "@/lib/errors";

export interface AuthFormError {
  message: string;
  /** Machine-readable reason from the server (e.g. "email_not_confirmed"). */
  reason?: string;
  code?: string;
}

type Failure<T> = Extract<ActionResult<T>, { ok: false }>;

/**
 * Run an auth server action with pending state and an inline error (auth
 * forms show errors next to the form rather than as toasts). Actions that
 * succeed by calling `redirect()` reject with Next's redirect signal, which is
 * re-thrown here so the router performs the navigation.
 */
export function useAuthAction<TInput, TData>(action: (input: TInput) => Promise<ActionResult<TData>>) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AuthFormError | null>(null);

  const run = useCallback(
    (input: TInput) =>
      new Promise<ActionResult<TData>>((resolve) => {
        setError(null);
        startTransition(async () => {
          let result: ActionResult<TData>;
          try {
            result = await action(input);
          } catch (thrown) {
            unstable_rethrow(thrown);
            result = { ok: false, error: "We couldn't reach the server. Check your connection and try again." };
          }
          if (!result.ok) setError(toFormError(result));
          resolve(result);
        });
      }),
    [action],
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, pending, error, clearError };
}

function toFormError<T>(result: Failure<T>): AuthFormError {
  const reason = result.details?.reason;
  return { message: result.error, reason: typeof reason === "string" ? reason : undefined, code: result.code };
}

/** Copy server-side field errors onto a React Hook Form instance. */
export function applyFieldErrors<TField extends string>(
  fieldErrors: Record<string, string[]> | undefined,
  fields: readonly TField[],
  setFieldError: (name: TField, error: { type: string; message: string }) => void,
) {
  if (!fieldErrors) return false;
  let applied = false;
  for (const name of fields) {
    const message = fieldErrors[name]?.[0];
    if (message) {
      setFieldError(name, { type: "server", message });
      applied = true;
    }
  }
  return applied;
}
