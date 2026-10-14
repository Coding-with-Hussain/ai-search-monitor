"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { refreshBillingStatusAction } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";

const AUTO_ATTEMPTS = 5;
const INTERVAL_MS = 3000;

/**
 * Shown after Stripe Checkout while the subscription is not active on our
 * side yet: asks the server to pull the subscription from Stripe a few times
 * (so activation doesn't depend on webhook latency), then offers a manual
 * "Refresh status" button.
 */
export function ActivationPoller() {
  const router = useRouter();
  const [checking, startTransition] = useTransition();
  const [polling, setPolling] = useState(true);
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(
    (manual: boolean) => {
      startTransition(async () => {
        attempts.current += 1;
        let active = false;
        try {
          const result = await refreshBillingStatusAction();
          active = result.ok && result.data.found && (result.data.status === "active" || result.data.status === "trialing");
          if (!result.ok && manual) toast.error(result.error);
        } catch {
          if (manual) toast.error("Network error. Check your connection and try again.");
        }
        if (active) {
          setPolling(false);
          toast.success("Your subscription is active");
          router.refresh();
          return;
        }
        if (!manual && attempts.current < AUTO_ATTEMPTS) {
          timer.current = setTimeout(() => check(false), INTERVAL_MS);
          return;
        }
        setPolling(false);
        if (manual) toast.message("Still activating — this can take up to a minute. Please try again shortly.");
      });
    },
    [router],
  );

  useEffect(() => {
    timer.current = setTimeout(() => check(false), 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [check]);

  const busy = checking || polling;
  return (
    <Button type="button" size="sm" variant="outline" onClick={() => check(true)} loading={busy} aria-live="polite">
      {!busy && <RefreshCw aria-hidden="true" />}
      {busy ? "Checking status…" : "Refresh status"}
    </Button>
  );
}
