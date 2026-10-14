"use client";

import Link from "next/link";
import type * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { trackClient } from "@/lib/analytics/client";

/** Link to the plans section of Billing that records an `upgrade_clicked` event. */
export function UpgradeLink({
  source,
  children,
  variant = "outline",
  size = "sm",
  className,
}: {
  /** Where the click came from (analytics property). */
  source: string;
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link href="/billing#plans" onClick={() => trackClient("upgrade_clicked", { source })}>
        {children}
      </Link>
    </Button>
  );
}
