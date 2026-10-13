"use client";

import { MailCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/errors";

import { AuthCard } from "./auth-card";
import { FormAlert } from "./form-alert";
import { useAuthAction } from "./use-auth-action";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * "Check your email" result screen with a rate-friendly resend button
 * (cooldown) and a way back to the form.
 */
export function CheckEmail({
  title = "Check your email",
  description,
  onResend,
  resendLabel = "Resend email",
  onStartOver,
  startOverLabel = "Use a different email",
  footer,
}: {
  title?: string;
  description: React.ReactNode;
  onResend?: () => Promise<ActionResult<unknown>>;
  resendLabel?: string;
  onStartOver?: () => void;
  startOverLabel?: string;
  footer?: React.ReactNode;
}) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const containerRef = useRef<HTMLDivElement>(null);
  const resend = useAuthAction<void, unknown>(async () => (onResend ? onResend() : { ok: true, data: null }));

  // Move focus to the result so keyboard and screen-reader users notice the change.
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleResend() {
    const result = await resend.run();
    if (result.ok) {
      toast.success("Email sent", { description: "It can take a minute to arrive. Check your spam folder too." });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
  }

  return (
    <div ref={containerRef} tabIndex={-1} className="rounded-xl focus:outline-none">
      <AuthCard icon={MailCheck} title={title} description={description} footer={footer}>
        <FormAlert error={resend.error} />
        <p className="text-[13px] text-muted-foreground">
          Didn&apos;t get it? Check your spam or promotions folder. Links work once and expire after a while.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {onResend && (
            <Button
              type="button"
              variant="outline"
              className="sm:flex-1"
              onClick={handleResend}
              loading={resend.pending}
              disabled={cooldown > 0}
            >
              {cooldown > 0 ? (
                <>
                  {resendLabel}
                  <span className="tabular text-subtle-foreground">
                    <span aria-hidden="true">({cooldown}s)</span>
                    <span className="sr-only">, available in {cooldown} seconds</span>
                  </span>
                </>
              ) : (
                resendLabel
              )}
            </Button>
          )}
          {onStartOver && (
            <Button type="button" variant="ghost" className="sm:flex-1" onClick={onStartOver}>
              {startOverLabel}
            </Button>
          )}
        </div>
      </AuthCard>
    </div>
  );
}
