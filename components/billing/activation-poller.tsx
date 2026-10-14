"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { refreshBillingStatusAction } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";

const AUTO_ATTEMPTS = 5;
const INTERVAL_MS = 3000;

type CheckResult = { active: true } | { active: false; error?: string };

/** Ask the server to pull the subscription from Stripe; true once it is active. */
async function checkActivation(): Promise<CheckResult> {
  try {
    const result = await refreshBillingStatusAction();
    if (!result.ok) return { active: false, error: result.error };
    const { found, status } = result.data;
    return found && (status === "active" || status === "trialing") ? { active: true } : { active: false };
  } catch {
    return { active: false, error: "Network error. Check your connection and try again." };
  }
}

/**
 * Shown after Stripe Checkout while the subscription is not active on our
 * side yet: checks with Stripe a few times (so activation doesn't depend on
 * webhook latency), then offers a manual "Refresh status" button.
 */
export function ActivationPoller() {
  const router = useRouter();
  const [checking, startTransition] = useTransition();
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function tick() {
      attempts += 1;
      startTransition(async () => {
        const result = await checkActivation();
        if (cancelled) return;
        if (result.active) {
          setPolling(false);
          toast.success("Your subscription is active");
          router.refresh();
        } else if (attempts < AUTO_ATTEMPTS) {
          timer = setTimeout(tick, INTERVAL_MS);
        } else {
          setPolling(false);
        }
      });
    }

    timer = setTimeout(tick, 600);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  function refreshNow() {
    startTransition(async () => {
      const result = await checkActivation();
      if (result.active) {
        toast.success("Your subscription is active");
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      } else {
        toast.message("Still activating — this can take up to a minute. Please try again shortly.");
      }
    });
  }

  const busy = checking || polling;
  return (
    <Button type="button" size="sm" variant="outline" onClick={refreshNow} loading={busy}>
      {!busy && <RefreshCw aria-hidden="true" />}
      <span aria-live="polite">{busy ? "Checking status…" : "Refresh status"}</span>
    </Button>
  );
}
