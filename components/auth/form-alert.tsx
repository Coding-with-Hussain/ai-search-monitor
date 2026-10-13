"use client";

import { useEffect, useRef } from "react";
import type * as React from "react";

import { Alert } from "@/components/ui/alert";

import type { AuthFormError } from "./use-auth-action";

/**
 * Form-level error from an auth action. Receives focus when it appears so
 * keyboard and screen-reader users land on the message.
 */
export function FormAlert({ error, children }: { error: AuthFormError | null; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  if (!error) return null;
  const variant = error.code === "RATE_LIMITED" || error.reason === "email_not_confirmed" ? "warning" : "danger";
  return (
    <div ref={ref} tabIndex={-1} className="mb-5 rounded-xl focus:outline-none">
      <Alert variant={variant}>
        <p className="text-[13px] font-medium text-foreground">{error.message}</p>
        {children && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">{children}</div>}
      </Alert>
    </div>
  );
}
