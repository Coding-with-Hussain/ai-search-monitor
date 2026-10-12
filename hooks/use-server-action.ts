"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import { useUpgradePrompt } from "@/components/billing/upgrade-dialog";
import type { ActionResult } from "@/lib/errors";

interface Options<T> {
  /** Toast shown on success (string or derived from the result). Omit for silent success. */
  successMessage?: string | ((data: T) => string | null);
  onSuccess?: (data: T) => void;
  onError?: (result: Extract<ActionResult<T>, { ok: false }>) => void;
}

/**
 * Call a server action with pending state and consistent feedback:
 * plan-limit errors open the upgrade dialog, other errors show a toast,
 * field errors are exposed for forms.
 */
export function useServerAction<TArgs extends unknown[], T>(
  action: (...args: TArgs) => Promise<ActionResult<T>>,
  options: Options<T> = {},
) {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();
  const upgrade = useUpgradePrompt();

  const execute = useCallback(
    (...args: TArgs) =>
      new Promise<ActionResult<T>>((resolve) => {
        startTransition(async () => {
          let result: ActionResult<T>;
          try {
            result = await action(...args);
          } catch {
            result = { ok: false, error: "Network error. Check your connection and try again." };
          }
          if (result.ok) {
            setFieldErrors(undefined);
            const msg = typeof options.successMessage === "function" ? options.successMessage(result.data) : options.successMessage;
            if (msg) toast.success(msg);
            options.onSuccess?.(result.data);
          } else {
            setFieldErrors(result.fieldErrors);
            if (result.code === "PLAN_LIMIT" || result.code === "SUBSCRIPTION_INACTIVE") {
              upgrade({ title: result.code === "PLAN_LIMIT" ? "You've reached a plan limit" : "Subscription inactive", message: result.error });
            } else {
              toast.error(result.error);
            }
            options.onError?.(result);
          }
          resolve(result);
        });
      }),
    [action, options, upgrade],
  );

  return { execute, pending, fieldErrors };
}
