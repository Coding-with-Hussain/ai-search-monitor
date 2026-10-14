"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * "Manage billing": a plain form POST to /api/billing/portal, which answers
 * with a redirect to the Stripe billing portal. When unavailable, the button
 * is disabled and the reason is shown next to it.
 */
export function PortalButton({
  label = "Manage billing",
  disabledReason,
  variant = "outline",
  size,
  className,
}: {
  label?: string;
  /** When set, the button is disabled and this explanation is shown. */
  disabledReason?: string | null;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const reasonId = useId();

  // Coming back with the browser's back button restores the page from cache: reset the spinner.
  useEffect(() => {
    const reset = () => setPending(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  if (disabledReason) {
    return (
      <div className={className}>
        <Button type="button" variant={variant} size={size} disabled aria-describedby={reasonId}>
          {label}
        </Button>
        <p id={reasonId} className="mt-2 max-w-sm text-xs leading-snug text-muted-foreground">
          {disabledReason}
        </p>
      </div>
    );
  }

  return (
    <form action="/api/billing/portal" method="POST" onSubmit={() => setPending(true)} className={className}>
      <Button type="submit" variant={variant} size={size} loading={pending}>
        {label}
        {!pending && <ExternalLink aria-hidden="true" />}
      </Button>
    </form>
  );
}
